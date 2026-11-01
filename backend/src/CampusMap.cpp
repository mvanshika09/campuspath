#include "CampusMap.hpp"
#include <fstream>
#include <sstream>
#include <algorithm>

namespace CampusPath {

namespace {

// Helper: Trim leading and trailing whitespace and carriage return characters
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) {
        return "";
    }
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, (last - first + 1));
}

// Helper: Split CSV row into column tokens, accounting for trailing empty columns
std::vector<std::string> splitCSVRow(const std::string& line) {
    std::vector<std::string> tokens;
    std::stringstream ss(line);
    std::string token;
    while (std::getline(ss, token, ',')) {
        tokens.push_back(trim(token));
    }
    // Handle edge case of trailing comma producing an empty final field
    if (!line.empty() && line.back() == ',') {
        tokens.push_back("");
    }
    return tokens;
}

// Helper: Strict integer parser (rejects non-numeric characters and overflow)
bool parseStrictInt(const std::string& s, int& outVal) {
    if (s.empty()) {
        return false;
    }
    size_t parsedLength = 0;
    try {
        int val = std::stoi(s, &parsedLength);
        if (parsedLength != s.length()) {
            return false; // Trailing garbage characters
        }
        outVal = val;
        return true;
    } catch (...) {
        return false;
    }
}

} // anonymous namespace

bool CampusMap::loadFromCSV(const std::string& nodesFilePath, const std::string& edgesFilePath) {
    // Staging structures for transactional loading (all-or-nothing)
    Graph stagingGraph;
    std::unordered_map<int, Node> stagingNodes;
    std::unordered_map<std::string, int> stagingNameToId;

    // ========================================================
    // 1. PARSE AND VALIDATE NODES CSV
    // ========================================================
    std::ifstream nodesFile(nodesFilePath);
    if (!nodesFile.is_open()) {
        lastError = "Failed to open nodes CSV file: " + nodesFilePath;
        return false;
    }

    std::string line;
    // Read header line
    if (!std::getline(nodesFile, line)) {
        lastError = "Nodes CSV file is empty: " + nodesFilePath;
        return false;
    }

    std::string header = trim(line);
    if (header != "id,name,category") {
        lastError = "Invalid header in nodes CSV (expected 'id,name,category'): " + header;
        return false;
    }

    size_t nodeRowCount = 0;
    size_t nodeLineNum = 1;
    while (std::getline(nodesFile, line)) {
        nodeLineNum++;
        std::string trimmedLine = trim(line);
        if (trimmedLine.empty()) {
            continue; // Skip blank lines
        }

        std::vector<std::string> tokens = splitCSVRow(trimmedLine);
        if (tokens.size() != 3) {
            lastError = "Malformed row in nodes CSV at line " + std::to_string(nodeLineNum) +
                        " (expected 3 columns): " + trimmedLine;
            return false;
        }

        int id = 0;
        if (!parseStrictInt(tokens[0], id) || id < 0) {
            lastError = "Invalid node ID at line " + std::to_string(nodeLineNum) +
                        " (must be non-negative integer): " + tokens[0];
            return false;
        }

        const std::string& name = tokens[1];
        if (name.empty()) {
            lastError = "Blank location name at line " + std::to_string(nodeLineNum);
            return false;
        }

        const std::string& category = tokens[2];
        if (category.empty()) {
            lastError = "Blank category at line " + std::to_string(nodeLineNum);
            return false;
        }

        if (stagingNodes.find(id) != stagingNodes.end()) {
            lastError = "Duplicate node ID at line " + std::to_string(nodeLineNum) +
                        ": ID " + std::to_string(id) + " already exists";
            return false;
        }

        Node node(id, name, category);
        stagingNodes.emplace(id, node);
        stagingNameToId.emplace(name, id);
        stagingGraph.addNode(node);
        nodeRowCount++;
    }

    if (nodeRowCount == 0) {
        lastError = "Nodes CSV contains no data rows: " + nodesFilePath;
        return false;
    }

    // ========================================================
    // 2. PARSE AND VALIDATE EDGES CSV
    // ========================================================
    std::ifstream edgesFile(edgesFilePath);
    if (!edgesFile.is_open()) {
        lastError = "Failed to open edges CSV file: " + edgesFilePath;
        return false;
    }

    if (!std::getline(edgesFile, line)) {
        lastError = "Edges CSV file is empty: " + edgesFilePath;
        return false;
    }

    header = trim(line);
    if (header != "source_id,destination_id,distance_meters") {
        lastError = "Invalid header in edges CSV (expected 'source_id,destination_id,distance_meters'): " + header;
        return false;
    }

    size_t edgeRowCount = 0;
    size_t edgeLineNum = 1;
    while (std::getline(edgesFile, line)) {
        edgeLineNum++;
        std::string trimmedLine = trim(line);
        if (trimmedLine.empty()) {
            continue; // Skip blank lines
        }

        std::vector<std::string> tokens = splitCSVRow(trimmedLine);
        if (tokens.size() != 3) {
            lastError = "Malformed row in edges CSV at line " + std::to_string(edgeLineNum) +
                        " (expected 3 columns): " + trimmedLine;
            return false;
        }

        int sourceId = 0;
        int destId = 0;
        int distance = 0;

        if (!parseStrictInt(tokens[0], sourceId)) {
            lastError = "Invalid source_id at line " + std::to_string(edgeLineNum) + ": " + tokens[0];
            return false;
        }

        if (!parseStrictInt(tokens[1], destId)) {
            lastError = "Invalid destination_id at line " + std::to_string(edgeLineNum) + ": " + tokens[1];
            return false;
        }

        if (!parseStrictInt(tokens[2], distance) || distance <= 0) {
            lastError = "Invalid distance at line " + std::to_string(edgeLineNum) +
                        " (must be strictly positive integer): " + tokens[2];
            return false;
        }

        if (stagingNodes.find(sourceId) == stagingNodes.end()) {
            lastError = "Edge references unknown source_id at line " + std::to_string(edgeLineNum) +
                        ": " + std::to_string(sourceId);
            return false;
        }

        if (stagingNodes.find(destId) == stagingNodes.end()) {
            lastError = "Edge references unknown destination_id at line " + std::to_string(edgeLineNum) +
                        ": " + std::to_string(destId);
            return false;
        }

        if (sourceId == destId) {
            lastError = "Self-loop edge rejected at line " + std::to_string(edgeLineNum) +
                        ": node " + std::to_string(sourceId) + " connects to itself";
            return false;
        }

        if (!stagingGraph.addEdge(sourceId, destId, distance)) {
            lastError = "Failed to add edge at line " + std::to_string(edgeLineNum) +
                        " (duplicate edge between " + std::to_string(sourceId) +
                        " and " + std::to_string(destId) + ")";
            return false;
        }

        edgeRowCount++;
    }

    if (edgeRowCount == 0) {
        lastError = "Edges CSV contains no data rows: " + edgesFilePath;
        return false;
    }

    // ========================================================
    // 3. COMMIT STAGED DATA TO MEMBER VARIABLES
    // ========================================================
    graph = std::move(stagingGraph);
    nodes = std::move(stagingNodes);
    nameToId = std::move(stagingNameToId);
    lastError.clear();

    return true;
}

const Graph& CampusMap::getGraph() const {
    return graph;
}

const std::unordered_map<int, Node>& CampusMap::getNodes() const {
    return nodes;
}

const Node* CampusMap::getNodeById(int id) const {
    auto it = nodes.find(id);
    if (it != nodes.end()) {
        return &(it->second);
    }
    return nullptr;
}

const Node* CampusMap::getNodeByName(const std::string& name) const {
    auto it = nameToId.find(name);
    if (it != nameToId.end()) {
        return getNodeById(it->second);
    }
    return nullptr;
}

std::vector<std::string> CampusMap::getPathLocationNames(const std::vector<int>& path) const {
    std::vector<std::string> names;
    names.reserve(path.size());

    for (int nodeId : path) {
        const Node* node = getNodeById(nodeId);
        if (node != nullptr) {
            names.push_back(node->name);
        } else {
            names.push_back("Unknown (" + std::to_string(nodeId) + ")");
        }
    }

    return names;
}

std::vector<std::string> CampusMap::getPathLocationNames(const PathResult& pathResult) const {
    return getPathLocationNames(pathResult.path);
}

size_t CampusMap::getNodeCount() const {
    return nodes.size();
}

size_t CampusMap::getEdgeCount() const {
    return graph.getEdgeCount();
}

const std::string& CampusMap::getLastError() const {
    return lastError;
}

bool CampusMap::isEmpty() const {
    return nodes.empty();
}

} // namespace CampusPath
