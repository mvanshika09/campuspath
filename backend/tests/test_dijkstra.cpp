#include "Common.hpp"
#include "Graph.hpp"
#include "Dijkstra.hpp"
#include <iostream>
#include <vector>
#include <cassert>

#define TEST_ASSERT(cond, msg) \
    do { \
        if (cond) { \
            std::cout << "  [PASS] " << msg << "\n"; \
            passedCount++; \
        } else { \
            std::cerr << "  [FAIL] " << msg << "\n"; \
            failedCount++; \
        } \
    } while (0)

// Helper function to print a path vector
void printPath(const std::vector<int>& path) {
    for (size_t i = 0; i < path.size(); ++i) {
        std::cout << path[i];
        if (i + 1 < path.size()) std::cout << " -> ";
    }
}

int main() {
    int passedCount = 0;
    int failedCount = 0;

    std::cout << "==================================================\n";
    std::cout << "  CampusPath - Dijkstra's Algorithm Unit Tests\n";
    std::cout << "==================================================\n\n";

    // ----------------------------------------------------
    // BUILD THE PRIMARY SAMPLE CAMPUS GRAPH
    // ----------------------------------------------------
    // Nodes:
    // 0 - Main Gate
    // 1 - CSE Block
    // 2 - Library
    // 3 - Canteen
    //
    // Edges:
    // 0 <-> 1: 200m
    // 1 <-> 2: 300m
    // 0 <-> 3: 150m
    // 3 <-> 2: 100m
    CampusPath::Graph campusGraph;
    campusGraph.addNode(CampusPath::Node(0, "Main Gate", "Gate"));
    campusGraph.addNode(CampusPath::Node(1, "CSE Block", "Academic"));
    campusGraph.addNode(CampusPath::Node(2, "Library", "Academic"));
    campusGraph.addNode(CampusPath::Node(3, "Canteen", "Facility"));

    campusGraph.addEdge(0, 1, 200);
    campusGraph.addEdge(1, 2, 300);
    campusGraph.addEdge(0, 3, 150);
    campusGraph.addEdge(3, 2, 100);

    // Add an isolated node 4 (Sports Complex) to test unreachable destinations
    campusGraph.addNode(CampusPath::Node(4, "Sports Complex", "Sports"));

    // ----------------------------------------------------
    // TEST 1: Direct Shortest Path
    // ----------------------------------------------------
    std::cout << "--- Test 1: Direct Shortest Path ---\n";
    {
        auto res = CampusPath::Dijkstra::findShortestPath(campusGraph, 0, 1);
        std::vector<int> expected = {0, 1};
        TEST_ASSERT(res.found, "Route found from 0 to 1");
        TEST_ASSERT(res.totalDistance == 200.0, "Distance is exactly 200m (Main Gate -> CSE Block)");
        TEST_ASSERT(res.path == expected, "Path is [0 -> 1]");
    }
    {
        auto res = CampusPath::Dijkstra::findShortestPath(campusGraph, 0, 3);
        std::vector<int> expected = {0, 3};
        TEST_ASSERT(res.found && res.totalDistance == 150.0 && res.path == expected,
                    "Route from 0 to 3 is direct [0 -> 3] with 150m");
    }

    // ----------------------------------------------------
    // TEST 2: Shortest Path Through Intermediate Nodes
    // ----------------------------------------------------
    std::cout << "\n--- Test 2: Shortest Path Through Intermediate Nodes ---\n";
    {
        auto res = CampusPath::Dijkstra::findShortestPath(campusGraph, 1, 3);
        // Possible paths:
        // 1 -> 0 -> 3 = 200 + 150 = 350m
        // 1 -> 2 -> 3 = 300 + 100 = 400m
        std::vector<int> expected = {1, 0, 3};
        TEST_ASSERT(res.found, "Route found from 1 to 3");
        TEST_ASSERT(res.totalDistance == 350.0, "Shortest distance is 350m (via Node 0)");
        TEST_ASSERT(res.path == expected, "Path traverses [1 -> 0 -> 3]");
    }

    // ----------------------------------------------------
    // TEST 3: Choosing the Shorter of Multiple Routes (Core Requirement)
    // ----------------------------------------------------
    std::cout << "\n--- Test 3: Choosing Shorter Route (Main Gate to Library) ---\n";
    {
        // Route A: 0 -> 1 -> 2 (200 + 300 = 500m)
        // Route B: 0 -> 3 -> 2 (150 + 100 = 250m)  <-- Optimal
        auto res = CampusPath::Dijkstra::findShortestPath(campusGraph, 0, 2);
        std::vector<int> expected = {0, 3, 2};
        std::cout << "  Found Path: ";
        printPath(res.path);
        std::cout << " (" << res.totalDistance << " metres)\n";

        TEST_ASSERT(res.found, "Route found from 0 (Main Gate) to 2 (Library)");
        TEST_ASSERT(res.totalDistance == 250.0, "Calculated distance is 250m (not 500m)");
        TEST_ASSERT(res.path == expected, "Optimal path is [0 -> 3 -> 2]");
    }

    // ----------------------------------------------------
    // TEST 4: Source Equals Destination
    // ----------------------------------------------------
    std::cout << "\n--- Test 4: Source Equals Destination ---\n";
    {
        auto res = CampusPath::Dijkstra::findShortestPath(campusGraph, 2, 2);
        std::vector<int> expected = {2};
        TEST_ASSERT(res.found, "Route found when source == destination");
        TEST_ASSERT(res.totalDistance == 0.0, "Distance is 0m");
        TEST_ASSERT(res.path == expected, "Path is single node [2]");
    }

    // ----------------------------------------------------
    // TEST 5: Unreachable Destination
    // ----------------------------------------------------
    std::cout << "\n--- Test 5: Unreachable Destination ---\n";
    {
        // Node 4 is in the graph but has no edges connected
        auto res = CampusPath::Dijkstra::findShortestPath(campusGraph, 0, 4);
        TEST_ASSERT(!res.found, "Path found flag is false for unreachable Node 4");
        TEST_ASSERT(res.path.empty(), "Path is empty for unreachable destination");
        TEST_ASSERT(res.totalDistance == 0.0, "Total distance is reset to 0.0");
    }

    // ----------------------------------------------------
    // TEST 6: Invalid Source Node
    // ----------------------------------------------------
    std::cout << "\n--- Test 6: Invalid Source Node ---\n";
    {
        auto res1 = CampusPath::Dijkstra::findShortestPath(campusGraph, 999, 2);
        auto res2 = CampusPath::Dijkstra::findShortestPath(campusGraph, -5, 2);
        TEST_ASSERT(!res1.found && res1.path.empty(), "Reject non-existent positive source ID (999)");
        TEST_ASSERT(!res2.found && res2.path.empty(), "Reject negative source ID (-5)");
    }

    // ----------------------------------------------------
    // TEST 7: Invalid Destination Node
    // ----------------------------------------------------
    std::cout << "\n--- Test 7: Invalid Destination Node ---\n";
    {
        auto res1 = CampusPath::Dijkstra::findShortestPath(campusGraph, 0, 999);
        auto res2 = CampusPath::Dijkstra::findShortestPath(campusGraph, 0, -1);
        TEST_ASSERT(!res1.found && res1.path.empty(), "Reject non-existent positive destination ID (999)");
        TEST_ASSERT(!res2.found && res2.path.empty(), "Reject negative destination ID (-1)");
    }

    // ----------------------------------------------------
    // TEST 8: Equal-Distance Alternative Routes
    // ----------------------------------------------------
    std::cout << "\n--- Test 8: Equal-Distance Alternative Routes ---\n";
    {
        // Diamond graph:
        // 10 -> 11 (100m) -> 13 (100m) => 200m
        // 10 -> 12 (100m) -> 13 (100m) => 200m
        CampusPath::Graph diamond;
        diamond.addNode(CampusPath::Node(10, "Point A", "Crossroad"));
        diamond.addNode(CampusPath::Node(11, "North Path", "Path"));
        diamond.addNode(CampusPath::Node(12, "South Path", "Path"));
        diamond.addNode(CampusPath::Node(13, "Point B", "Crossroad"));

        diamond.addEdge(10, 11, 100);
        diamond.addEdge(11, 13, 100);
        diamond.addEdge(10, 12, 100);
        diamond.addEdge(12, 13, 100);

        auto res = CampusPath::Dijkstra::findShortestPath(diamond, 10, 13);
        std::vector<int> option1 = {10, 11, 13};
        std::vector<int> option2 = {10, 12, 13};

        TEST_ASSERT(res.found, "Route found across diamond graph");
        TEST_ASSERT(res.totalDistance == 200.0, "Distance is exactly 200m");
        TEST_ASSERT(res.path == option1 || res.path == option2,
                    "Selected path is a valid shortest route ([10->11->13] or [10->12->13])");
    }

    // ----------------------------------------------------
    // TEST 9: Disconnected Graph Components
    // ----------------------------------------------------
    std::cout << "\n--- Test 9: Disconnected Graph Components ---\n";
    {
        CampusPath::Graph disconnected;
        // Component 1: 20 <-> 21
        disconnected.addNode(CampusPath::Node(20, "North Campus Gate", "Gate"));
        disconnected.addNode(CampusPath::Node(21, "North Hostel", "Hostel"));
        disconnected.addEdge(20, 21, 80);

        // Component 2: 30 <-> 31
        disconnected.addNode(CampusPath::Node(30, "South Campus Gate", "Gate"));
        disconnected.addNode(CampusPath::Node(31, "South Hostel", "Hostel"));
        disconnected.addEdge(30, 31, 90);

        auto res = CampusPath::Dijkstra::findShortestPath(disconnected, 20, 30);
        TEST_ASSERT(!res.found, "No path exists between two disconnected components");
        TEST_ASSERT(res.path.empty(), "Path vector is empty");
    }

    // ----------------------------------------------------
    // TEST 10: Correct Path Reconstruction Verification
    // ----------------------------------------------------
    std::cout << "\n--- Test 10: Path Reconstruction & Step Verification ---\n";
    {
        auto res = CampusPath::Dijkstra::findShortestPath(campusGraph, 0, 2);
        TEST_ASSERT(res.path.size() >= 2, "Path contains at least 2 nodes");
        TEST_ASSERT(res.path.front() == 0, "Path begins at source (0)");
        TEST_ASSERT(res.path.back() == 2, "Path ends at destination (2)");

        // Verify every consecutive pair has a direct edge in the graph
        bool allEdgesExist = true;
        for (size_t i = 0; i + 1 < res.path.size(); ++i) {
            if (!campusGraph.hasEdge(res.path[i], res.path[i + 1])) {
                allEdgesExist = false;
                break;
            }
        }
        TEST_ASSERT(allEdgesExist, "Every step in reconstructed path corresponds to a real edge");
    }

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    std::cout << "\n==================================================\n";
    std::cout << "  Dijkstra Test Summary: " << passedCount << " Passed, " << failedCount << " Failed\n";
    std::cout << "==================================================\n";

    return (failedCount == 0) ? 0 : 1;
}
