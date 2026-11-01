#include "Common.hpp"
#include "Graph.hpp"
#include "Dijkstra.hpp"
#include "CampusMap.hpp"
#include "httplib.h"
#include "json.hpp"

#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include <algorithm>
#include <fstream>

using json = nlohmann::json;

namespace {

// Helper: Sets standard Cross-Origin Resource Sharing (CORS) headers
void applyCORSHeaders(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type, Accept");
}

} // anonymous namespace

int main() {
    CampusPath::CampusMap campusMap;

    // Resolve dataset paths whether launched from workspace root or backend/
    std::string nodesPath = "backend/data/nodes.csv";
    std::string edgesPath = "backend/data/edges.csv";
    if (!std::ifstream(nodesPath).good()) {
        nodesPath = "data/nodes.csv";
        edgesPath = "data/edges.csv";
    }

    if (!campusMap.loadFromCSV(nodesPath, edgesPath)) {
        std::cerr << "Fatal Error: Failed to load campus dataset.\n";
        std::cerr << campusMap.getLastError() << "\n";
        return 1;
    }

    httplib::Server svr;

    // ----------------------------------------------------
    // CORS PRE-FLIGHT HANDLER (HTTP OPTIONS)
    // ----------------------------------------------------
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        applyCORSHeaders(res);
        res.status = 204; // 204 No Content
    });

    // ----------------------------------------------------
    // GET /api/locations
    // Returns all campus locations sorted by ID
    // ----------------------------------------------------
    svr.Get("/api/locations", [&campusMap](const httplib::Request&, httplib::Response& res) {
        std::cout << "[API] GET /api/locations\n";

        std::vector<CampusPath::Node> sortedNodes;
        sortedNodes.reserve(campusMap.getNodeCount());
        for (const auto& [id, node] : campusMap.getNodes()) {
            sortedNodes.push_back(node);
        }
        std::sort(sortedNodes.begin(), sortedNodes.end(),
                  [](const CampusPath::Node& a, const CampusPath::Node& b) {
                      return a.id < b.id;
                  });

        json locArray = json::array();
        for (const auto& node : sortedNodes) {
            locArray.push_back({
                {"id", node.id},
                {"name", node.name},
                {"category", node.category}
            });
        }

        applyCORSHeaders(res);
        res.status = 200;
        res.set_content(locArray.dump(2), "application/json");
    });

    // ----------------------------------------------------
    // GET /api/connections
    // Returns all unique undirected walking paths
    // ----------------------------------------------------
    svr.Get("/api/connections", [&campusMap](const httplib::Request&, httplib::Response& res) {
        std::cout << "[API] GET /api/connections\n";

        struct Connection {
            int src;
            std::string srcName;
            int dest;
            std::string destName;
            int distance;
        };

        std::vector<Connection> connections;
        for (const auto& [nodeId, node] : campusMap.getNodes()) {
            const auto& neighbors = campusMap.getGraph().getNeighbors(nodeId);
            for (const auto& edge : neighbors) {
                // Ensure each undirected connection is reported only once
                if (nodeId < edge.destination) {
                    const auto* destNode = campusMap.getNodeById(edge.destination);
                    std::string destName = (destNode != nullptr) ? destNode->name : "Unknown";
                    connections.push_back({
                        nodeId,
                        node.name,
                        edge.destination,
                        destName,
                        static_cast<int>(edge.distance)
                    });
                }
            }
        }

        std::sort(connections.begin(), connections.end(),
                  [](const Connection& a, const Connection& b) {
                      if (a.src != b.src) return a.src < b.src;
                      return a.dest < b.dest;
                  });

        json connArray = json::array();
        for (const auto& conn : connections) {
            connArray.push_back({
                {"source", conn.src},
                {"source_name", conn.srcName},
                {"destination", conn.dest},
                {"destination_name", conn.destName},
                {"distance", conn.distance}
            });
        }

        applyCORSHeaders(res);
        res.status = 200;
        res.set_content(connArray.dump(2), "application/json");
    });

    // ----------------------------------------------------
    // POST /api/shortest-path
    // Calculates the shortest walking route using Dijkstra
    // ----------------------------------------------------
    svr.Post("/api/shortest-path", [&campusMap](const httplib::Request& req, httplib::Response& res) {
        std::cout << "[API] POST /api/shortest-path - Body: " << req.body << "\n";

        // Parse JSON payload
        json reqJson;
        try {
            reqJson = json::parse(req.body);
        } catch (const json::parse_error& e) {
            applyCORSHeaders(res);
            res.status = 400;
            res.set_content(json({
                {"success", false},
                {"error", "Malformed JSON payload: invalid JSON syntax."}
            }).dump(2), "application/json");
            return;
        }

        // Validate presence and types of source and destination
        if (!reqJson.contains("source") || !reqJson.contains("destination") ||
            !reqJson["source"].is_number_integer() || !reqJson["destination"].is_number_integer()) {
            applyCORSHeaders(res);
            res.status = 400;
            res.set_content(json({
                {"success", false},
                {"error", "Invalid request: 'source' and 'destination' integer fields are required."}
            }).dump(2), "application/json");
            return;
        }

        int sourceId = reqJson["source"].get<int>();
        int destId = reqJson["destination"].get<int>();

        const auto* sourceNode = campusMap.getNodeById(sourceId);
        const auto* destNode = campusMap.getNodeById(destId);

        // Validate node existence
        if (sourceNode == nullptr || destNode == nullptr) {
            int missingId = (sourceNode == nullptr) ? sourceId : destId;
            applyCORSHeaders(res);
            res.status = 404;
            res.set_content(json({
                {"success", false},
                {"error", "Location ID " + std::to_string(missingId) + " does not exist."}
            }).dump(2), "application/json");
            return;
        }

        // Special case: source equals destination
        if (sourceId == destId) {
            applyCORSHeaders(res);
            res.status = 200;
            json responseJson = {
                {"success", true},
                {"distance", 0},
                {"route", json::array({
                    {{"id", sourceNode->id}, {"name", sourceNode->name}}
                })}
            };
            res.set_content(responseJson.dump(2), "application/json");
            return;
        }

        // Compute shortest path using existing Dijkstra implementation
        CampusPath::PathResult result = CampusPath::Dijkstra::findShortestPath(
            campusMap.getGraph(), sourceId, destId
        );

        if (!result.found) {
            applyCORSHeaders(res);
            res.status = 404;
            res.set_content(json({
                {"success", false},
                {"error", "No walking route exists between " + sourceNode->name + " and " + destNode->name + "."}
            }).dump(2), "application/json");
            return;
        }

        json routeArray = json::array();
        for (int id : result.path) {
            const auto* node = campusMap.getNodeById(id);
            std::string name = (node != nullptr) ? node->name : "Unknown";
            routeArray.push_back({
                {"id", id},
                {"name", name}
            });
        }

        json responseJson = {
            {"success", true},
            {"distance", static_cast<int>(result.totalDistance)},
            {"route", routeArray}
        };

        applyCORSHeaders(res);
        res.status = 200;
        res.set_content(responseJson.dump(2), "application/json");
    });

    const std::string host = "127.0.0.1";
    const int port = 8080;

    std::cout << "====================================================\n";
    std::cout << "  CampusPath HTTP API Server running on " << host << ":" << port << "\n";
    std::cout << "====================================================\n";
    std::cout << "Endpoints:\n";
    std::cout << "  GET  /api/locations\n";
    std::cout << "  GET  /api/connections\n";
    std::cout << "  POST /api/shortest-path\n";
    std::cout << "Press Ctrl+C to stop the server.\n\n";

    svr.listen(host, port);

    return 0;
}
