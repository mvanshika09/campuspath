#include "Common.hpp"
#include "Graph.hpp"
#include <iostream>
#include <cassert>
#include <iomanip>

// Helper macro for formatted test logging
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

int main() {
    int passedCount = 0;
    int failedCount = 0;

    std::cout << "========================================\n";
    std::cout << "  CampusPath - Graph Unit Tests\n";
    std::cout << "========================================\n\n";

    CampusPath::Graph graph;

    // ----------------------------------------------------
    // TEST 1: Adding Valid Campus Locations (Nodes)
    // ----------------------------------------------------
    std::cout << "--- Test Group 1: Adding Nodes ---\n";
    TEST_ASSERT(graph.addNode(CampusPath::Node(0, "Main Gate", "Gate")), "Add Node 0 (Main Gate)");
    TEST_ASSERT(graph.addNode(CampusPath::Node(1, "CSE Block", "Academic")), "Add Node 1 (CSE Block)");
    TEST_ASSERT(graph.addNode(CampusPath::Node(2, "Library", "Academic")), "Add Node 2 (Library)");
    TEST_ASSERT(graph.addNode(CampusPath::Node(3, "Canteen", "Facility")), "Add Node 3 (Canteen)");
    TEST_ASSERT(graph.getNodeCount() == 4, "Total node count is 4");
    TEST_ASSERT(graph.hasNode(0) && graph.hasNode(1) && graph.hasNode(2) && graph.hasNode(3), "All 4 nodes exist");

    // ----------------------------------------------------
    // TEST 2: Rejecting Duplicate Nodes
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 2: Duplicate Node Validation ---\n";
    bool dupAdded = graph.addNode(CampusPath::Node(0, "Main Gate Copy", "Gate"));
    TEST_ASSERT(!dupAdded, "Reject duplicate Node ID 0");
    TEST_ASSERT(graph.getNodeCount() == 4, "Node count remains 4 after rejecting duplicate");

    // ----------------------------------------------------
    // TEST 3: Adding Valid Connections (Edges)
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 3: Adding Edges ---\n";
    // Connections:
    // Main Gate (0) <-> CSE Block (1): 200m
    // CSE Block (1) <-> Library (2): 300m
    // Main Gate (0) <-> Canteen (3): 150m
    // Canteen (3) <-> Library (2): 100m
    TEST_ASSERT(graph.addEdge(0, 1, 200), "Add Edge: Main Gate (0) <-> CSE Block (1) [200m]");
    TEST_ASSERT(graph.addEdge(1, 2, 300), "Add Edge: CSE Block (1) <-> Library (2) [300m]");
    TEST_ASSERT(graph.addEdge(0, 3, 150), "Add Edge: Main Gate (0) <-> Canteen (3) [150m]");
    TEST_ASSERT(graph.addEdge(3, 2, 100), "Add Edge: Canteen (3) <-> Library (2) [100m]");
    TEST_ASSERT(graph.getEdgeCount() == 4, "Total undirected edge count is 4");

    // ----------------------------------------------------
    // TEST 4: Bidirectional Connectivity
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 4: Bidirectional Verification ---\n";
    TEST_ASSERT(graph.hasEdge(0, 1) && graph.hasEdge(1, 0), "Edge (0 <-> 1) exists both ways");
    TEST_ASSERT(graph.hasEdge(1, 2) && graph.hasEdge(2, 1), "Edge (1 <-> 2) exists both ways");
    TEST_ASSERT(graph.hasEdge(0, 3) && graph.hasEdge(3, 0), "Edge (0 <-> 3) exists both ways");
    TEST_ASSERT(graph.hasEdge(3, 2) && graph.hasEdge(2, 3), "Edge (3 <-> 2) exists both ways");
    TEST_ASSERT(!graph.hasEdge(0, 2), "No direct edge between Main Gate (0) and Library (2)");

    // ----------------------------------------------------
    // TEST 5: Retrieving Neighbours
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 5: Querying Neighbours ---\n";
    const auto& neighbors0 = graph.getNeighbors(0);
    TEST_ASSERT(neighbors0.size() == 2, "Main Gate (0) has exactly 2 neighbours (CSE Block & Canteen)");

    bool found1From0 = false;
    bool found3From0 = false;
    for (const auto& edge : neighbors0) {
        if (edge.destination == 1 && edge.distance == 200.0) found1From0 = true;
        if (edge.destination == 3 && edge.distance == 150.0) found3From0 = true;
    }
    TEST_ASSERT(found1From0 && found3From0, "Neighbours of Node 0 have correct destination IDs and distances");

    const auto& neighbors2 = graph.getNeighbors(2);
    TEST_ASSERT(neighbors2.size() == 2, "Library (2) has exactly 2 neighbours (CSE Block & Canteen)");

    // ----------------------------------------------------
    // TEST 6: Rejecting Duplicate Edges
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 6: Duplicate Edge Validation ---\n";
    TEST_ASSERT(!graph.addEdge(0, 1, 200), "Reject duplicate edge (0 -> 1)");
    TEST_ASSERT(!graph.addEdge(1, 0, 200), "Reject duplicate reverse edge (1 -> 0)");

    // ----------------------------------------------------
    // TEST 7: Invalid Node IDs for Edges
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 7: Invalid Node ID Validation ---\n";
    TEST_ASSERT(!graph.addEdge(0, 99, 100), "Reject edge with non-existent destination ID (99)");
    TEST_ASSERT(!graph.addEdge(88, 1, 100), "Reject edge with non-existent source ID (88)");
    TEST_ASSERT(!graph.addEdge(-1, 2, 100), "Reject edge with negative source ID (-1)");

    // ----------------------------------------------------
    // TEST 8: Zero and Negative Distances
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 8: Zero and Negative Distance Validation ---\n";
    // Create an unconnected dummy node 4 to test new edge additions
    graph.addNode(CampusPath::Node(4, "Admin Block", "Admin"));
    TEST_ASSERT(!graph.addEdge(0, 4, 0), "Reject zero distance (0 metres)");
    TEST_ASSERT(!graph.addEdge(0, 4, -50), "Reject negative distance (-50 metres)");

    // ----------------------------------------------------
    // TEST 9: Rejecting Self-Loops
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 9: Self-Loop Validation ---\n";
    TEST_ASSERT(!graph.addEdge(1, 1, 50), "Reject self-loop on Node 1 (1 -> 1)");

    // ----------------------------------------------------
    // TEST 10: Safe Querying (No Accidental Map Modification)
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 10: Safe Querying & Non-Modification ---\n";
    size_t nodeCountBefore = graph.getNodeCount();
    const auto& nonExistentNeighbors = graph.getNeighbors(999);
    TEST_ASSERT(nonExistentNeighbors.empty(), "Querying non-existent node 999 returns empty vector");
    TEST_ASSERT(!graph.hasNode(999), "Querying neighbours did not insert node 999");
    TEST_ASSERT(graph.getNodeCount() == nodeCountBefore, "Graph node count remained unchanged");

    // ----------------------------------------------------
    // FINAL SUMMARY
    // ----------------------------------------------------
    std::cout << "\n========================================\n";
    std::cout << "  Test Summary: " << passedCount << " Passed, " << failedCount << " Failed\n";
    std::cout << "========================================\n";

    return (failedCount == 0) ? 0 : 1;
}
