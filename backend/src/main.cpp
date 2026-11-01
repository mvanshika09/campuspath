#include "Common.hpp"
#include "Graph.hpp"
#include "Dijkstra.hpp"
#include "CampusMap.hpp"

#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include <sstream>
#include <algorithm>
#include <fstream>

/**
 * @file main.cpp
 * @brief Interactive, menu-driven console application for CampusPath navigation.
 * 
 * Demonstrates:
 * - Loading campus map data from CSV files via CampusMap.
 * - Displaying campus landmarks and walkways.
 * - Calculating optimal routes using Dijkstra's algorithm.
 * - Robust input validation handling invalid choices, non-numeric input, and EOF.
 */

namespace {

// Helper: Trim whitespace and newline characters from user input
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, (last - first + 1));
}

// Helper: Safely reads a line from std::cin, detecting EOF
bool readLine(std::string& outLine) {
    if (!std::getline(std::cin, outLine)) {
        return false; // Reached End-Of-File (EOF) or stream closed
    }
    outLine = trim(outLine);
    return true;
}

// Helper: Robust integer parser that handles non-numeric and empty input gracefully
bool readIntegerInput(const std::string& prompt, int& outValue) {
    while (true) {
        std::cout << prompt;
        std::string line;
        if (!readLine(line)) {
            return false; // EOF
        }
        if (line.empty()) {
            std::cout << "Error: Input cannot be empty. Please enter a valid number.\n\n";
            continue;
        }

        size_t parsedLength = 0;
        try {
            int val = std::stoi(line, &parsedLength);
            if (parsedLength == line.length()) {
                outValue = val;
                return true;
            }
        } catch (...) {
            // Catches std::invalid_argument and std::out_of_range
        }

        std::cout << "Error: '" << line << "' is not a valid integer. Please try again.\n\n";
    }
}

// Display the main navigation menu
void displayMenu() {
    std::cout << "\n========================================\n";
    std::cout << "              CAMPUSPATH\n";
    std::cout << "    Smart Campus Navigation System\n";
    std::cout << "========================================\n\n";
    std::cout << "1. View All Campus Locations\n";
    std::cout << "2. View Campus Connections\n";
    std::cout << "3. Find Shortest Route\n";
    std::cout << "4. Exit\n\n";
}

// Feature 1: View all registered campus locations in ascending ID order
void viewLocations(const CampusPath::CampusMap& campusMap) {
    std::cout << "\n--------------------------------------------------\n";
    std::cout << "  CAMPUS LOCATIONS\n";
    std::cout << "--------------------------------------------------\n";
    std::cout << std::left << std::setw(6) << "ID"
              << std::setw(22) << "Location"
              << "Category\n";
    std::cout << "--------------------------------------------------\n";

    // Collect all nodes and sort them by ID
    std::vector<CampusPath::Node> sortedNodes;
    sortedNodes.reserve(campusMap.getNodeCount());
    for (const auto& [id, node] : campusMap.getNodes()) {
        sortedNodes.push_back(node);
    }
    std::sort(sortedNodes.begin(), sortedNodes.end(),
              [](const CampusPath::Node& a, const CampusPath::Node& b) {
                  return a.id < b.id;
              });

    for (const auto& node : sortedNodes) {
        std::cout << std::left << std::setw(6) << node.id
                  << std::setw(22) << node.name
                  << node.category << "\n";
    }
    std::cout << "--------------------------------------------------\n";
}

// Feature 2: View all unique campus walking connections
void viewConnections(const CampusPath::CampusMap& campusMap) {
    std::cout << "\n------------------------------------------------------------\n";
    std::cout << "  CAMPUS WALKING CONNECTIONS\n";
    std::cout << "------------------------------------------------------------\n";

    // Structure for storing unique undirected connections
    struct ConnectionRecord {
        int srcId;
        int destId;
        std::string srcName;
        std::string destName;
        double distance;
    };

    std::vector<ConnectionRecord> connections;
    for (const auto& [nodeId, node] : campusMap.getNodes()) {
        const auto& neighbors = campusMap.getGraph().getNeighbors(nodeId);
        for (const auto& edge : neighbors) {
            // Display each undirected connection only once by ensuring srcId < destId
            if (nodeId < edge.destination) {
                const auto* destNode = campusMap.getNodeById(edge.destination);
                std::string destName = (destNode != nullptr) ? destNode->name : "Unknown";
                connections.push_back({nodeId, edge.destination, node.name, destName, edge.distance});
            }
        }
    }

    // Sort connections by source ID then destination ID for consistent display
    std::sort(connections.begin(), connections.end(),
              [](const ConnectionRecord& a, const ConnectionRecord& b) {
                  if (a.srcId != b.srcId) return a.srcId < b.srcId;
                  return a.destId < b.destId;
              });

    for (const auto& conn : connections) {
        std::cout << std::left << std::setw(18) << conn.srcName
                  << "<->  " << std::setw(18) << conn.destName
                  << ": " << static_cast<int>(conn.distance) << " metres\n";
    }
    std::cout << "------------------------------------------------------------\n";
    std::cout << "Total unique connections: " << connections.size() << "\n";
}

// Feature 3: Find and display the shortest route between two locations
void findShortestRoute(const CampusPath::CampusMap& campusMap) {
    // 1. Display available locations so the user can easily choose IDs
    viewLocations(campusMap);
    std::cout << "\n";

    // 2. Read and validate source ID
    int sourceId = -1;
    while (true) {
        if (!readIntegerInput("Enter source location ID: ", sourceId)) {
            return; // EOF encountered
        }
        if (campusMap.getNodeById(sourceId) == nullptr) {
            std::cout << "Error: Location ID " << sourceId << " does not exist. Please enter a valid ID from above.\n\n";
            continue;
        }
        break;
    }

    // 3. Read and validate destination ID
    int destId = -1;
    while (true) {
        if (!readIntegerInput("Enter destination location ID: ", destId)) {
            return; // EOF encountered
        }
        if (campusMap.getNodeById(destId) == nullptr) {
            std::cout << "Error: Location ID " << destId << " does not exist. Please enter a valid ID from above.\n\n";
            continue;
        }
        break;
    }

    const auto* sourceNode = campusMap.getNodeById(sourceId);
    const auto* destNode = campusMap.getNodeById(destId);

    std::cout << "\n========================================\n";
    std::cout << "          SHORTEST ROUTE RESULT\n";
    std::cout << "========================================\n\n";
    std::cout << "Source: " << sourceNode->name << "\n";
    std::cout << "Destination: " << destNode->name << "\n\n";

    // Handle special case: source equals destination
    if (sourceId == destId) {
        std::cout << "Recommended Route:\n";
        std::cout << sourceNode->name << "\n\n";
        std::cout << "Total Distance: 0 metres\n\n";
        std::cout << "========================================\n";
        return;
    }

    // 4. Calculate shortest path using Dijkstra's algorithm
    CampusPath::PathResult result = CampusPath::Dijkstra::findShortestPath(campusMap.getGraph(), sourceId, destId);

    // Handle unreachable destinations
    if (!result.found) {
        std::cout << "No walking route found between " << sourceNode->name
                  << " and " << destNode->name << ".\n\n";
        std::cout << "========================================\n";
        return;
    }

    // 5. Convert node IDs into human-readable location names
    std::vector<std::string> pathNames = campusMap.getPathLocationNames(result);

    std::cout << "Recommended Route:\n";
    for (size_t i = 0; i < pathNames.size(); ++i) {
        std::cout << pathNames[i];
        if (i + 1 < pathNames.size()) {
            std::cout << " -> ";
        }
    }
    std::cout << "\n\n";
    std::cout << "Total Distance: " << static_cast<int>(result.totalDistance) << " metres\n\n";
    std::cout << "========================================\n";
}

} // anonymous namespace

int main() {
    CampusPath::CampusMap campusMap;

    // Resolve CSV file paths: supports running from workspace root or backend/ directory
    std::string nodesPath = "backend/data/nodes.csv";
    std::string edgesPath = "backend/data/edges.csv";
    if (!std::ifstream(nodesPath).good()) {
        nodesPath = "data/nodes.csv";
        edgesPath = "data/edges.csv";
    }

    // Load and validate campus dataset
    if (!campusMap.loadFromCSV(nodesPath, edgesPath)) {
        std::cerr << "Fatal Error: Failed to load campus dataset.\n";
        std::cerr << campusMap.getLastError() << "\n";
        return 1;
    }

    bool isRunning = true;
    while (isRunning) {
        displayMenu();

        int choice = 0;
        if (!readIntegerInput("Enter your choice: ", choice)) {
            // Graceful exit on EOF (e.g., Ctrl+D or script completion)
            std::cout << "\nThank you for using CampusPath!\n";
            break;
        }

        switch (choice) {
            case 1:
                viewLocations(campusMap);
                break;
            case 2:
                viewConnections(campusMap);
                break;
            case 3:
                findShortestRoute(campusMap);
                break;
            case 4:
                std::cout << "\nThank you for using CampusPath!\n";
                isRunning = false;
                break;
            default:
                std::cout << "\nInvalid choice (" << choice << "). Please select an option between 1 and 4.\n";
                break;
        }
    }

    return 0;
}
