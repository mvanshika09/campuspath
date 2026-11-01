#include "Common.hpp"
#include "Graph.hpp"
#include "Dijkstra.hpp"
#include "CampusMap.hpp"
#include <iostream>
#include <fstream>
#include <vector>
#include <cassert>
#include <cstdio>

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

// Helper to write temporary CSV files for edge case testing
void writeTempFile(const std::string& path, const std::string& content) {
    std::ofstream out(path);
    out << content;
}

// Helper to delete temporary test files
void removeTempFile(const std::string& path) {
    std::remove(path.c_str());
}

int main() {
    int passedCount = 0;
    int failedCount = 0;

    std::cout << "==================================================\n";
    std::cout << "  CampusPath - CampusMap & CSV Loader Unit Tests\n";
    std::cout << "==================================================\n\n";

    // Dynamic path detection: ensures tests work seamlessly whether
    // invoked from the repository root or the backend/ directory.
    std::string validNodesPath = "data/nodes.csv";
    std::string validEdgesPath = "data/edges.csv";
    std::string tempPrefix = "tests/temp_";
    if (!std::ifstream(validNodesPath).good()) {
        validNodesPath = "backend/data/nodes.csv";
        validEdgesPath = "backend/data/edges.csv";
        tempPrefix = "backend/tests/temp_";
    }

    CampusPath::CampusMap campusMap;

    // ----------------------------------------------------
    // TEST 1 & 2: Loading Real Dataset
    // ----------------------------------------------------
    std::cout << "--- Test Group 1: Loading Real Campus Dataset ---\n";
    bool loadOk = campusMap.loadFromCSV(validNodesPath, validEdgesPath);
    TEST_ASSERT(loadOk, "Successfully loaded valid nodes.csv and edges.csv");
    TEST_ASSERT(campusMap.getNodeCount() == 8, "Loaded exactly 8 campus locations");
    TEST_ASSERT(campusMap.getEdgeCount() == 11, "Loaded exactly 11 undirected walking connections");

    // ----------------------------------------------------
    // TEST 3 & 4: Location Names and Categories
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 2: Verifying Location Metadata ---\n";
    const auto* node0 = campusMap.getNodeById(0);
    TEST_ASSERT(node0 != nullptr && node0->name == "Main Gate" && node0->category == "Entrance",
                "Node 0: 'Main Gate', Category: 'Entrance'");

    const auto* node1 = campusMap.getNodeById(1);
    TEST_ASSERT(node1 != nullptr && node1->name == "CSE Block" && node1->category == "Academic",
                "Node 1: 'CSE Block', Category: 'Academic'");

    const auto* node2 = campusMap.getNodeById(2);
    TEST_ASSERT(node2 != nullptr && node2->name == "Library" && node2->category == "Academic",
                "Node 2: 'Library', Category: 'Academic'");

    const auto* node3 = campusMap.getNodeById(3);
    TEST_ASSERT(node3 != nullptr && node3->name == "Canteen" && node3->category == "Food",
                "Node 3: 'Canteen', Category: 'Food'");

    const auto* node7 = campusMap.getNodeById(7);
    TEST_ASSERT(node7 != nullptr && node7->name == "Admin Block" && node7->category == "Administration",
                "Node 7: 'Admin Block', Category: 'Administration'");

    // ----------------------------------------------------
    // TEST 5 & 6: Lookup by Valid ID and Name
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 3: Valid ID & Name Lookups ---\n";
    const auto* foundById = campusMap.getNodeById(5);
    TEST_ASSERT(foundById != nullptr && foundById->name == "Auditorium",
                "Lookup ID 5 yields 'Auditorium'");

    const auto* foundByName = campusMap.getNodeByName("Hostel");
    TEST_ASSERT(foundByName != nullptr && foundByName->id == 4 && foundByName->category == "Residential",
                "Lookup Name 'Hostel' yields ID 4 with category 'Residential'");

    // ----------------------------------------------------
    // TEST 7 & 8: Handling Unknown IDs and Names
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 4: Unknown ID & Name Lookups ---\n";
    TEST_ASSERT(campusMap.getNodeById(999) == nullptr, "Lookup unknown ID 999 returns nullptr");
    TEST_ASSERT(campusMap.getNodeById(-1) == nullptr, "Lookup negative ID -1 returns nullptr");
    TEST_ASSERT(campusMap.getNodeByName("NonExistentHall") == nullptr,
                "Lookup unknown name 'NonExistentHall' returns nullptr");

    // ----------------------------------------------------
    // TEST 9: Loading an Invalid File Path
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 5: Non-Existent File Paths ---\n";
    CampusPath::CampusMap failMap;
    bool badPathOk = failMap.loadFromCSV(tempPrefix + "does_not_exist.csv", validEdgesPath);
    TEST_ASSERT(!badPathOk, "Reject non-existent nodes file");
    TEST_ASSERT(!failMap.getLastError().empty(), "Error message is recorded for missing file");
    TEST_ASSERT(failMap.isEmpty(), "Failed map remains empty");

    // ----------------------------------------------------
    // TEST 10: Rejecting Malformed CSV Rows
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 6: Malformed CSV Rows ---\n";
    const std::string malformedNodes = tempPrefix + "malformed_nodes.csv";
    writeTempFile(malformedNodes, "id,name,category\n0,Main Gate\n"); // Missing category column
    bool malformedOk = failMap.loadFromCSV(malformedNodes, validEdgesPath);
    TEST_ASSERT(!malformedOk, "Reject row with missing column in nodes file");
    removeTempFile(malformedNodes);

    // ----------------------------------------------------
    // TEST 11: Rejecting Duplicate Node IDs
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 7: Duplicate Node ID Validation ---\n";
    const std::string dupNodes = tempPrefix + "dup_nodes.csv";
    writeTempFile(dupNodes, "id,name,category\n0,Main Gate,Entrance\n0,Duplicate Gate,Entrance\n");
    bool dupOk = failMap.loadFromCSV(dupNodes, validEdgesPath);
    TEST_ASSERT(!dupOk, "Reject duplicate node ID 0");
    removeTempFile(dupNodes);

    // ----------------------------------------------------
    // TEST 12: Rejecting Invalid Edge Distances
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 8: Invalid Edge Distances ---\n";
    const std::string invalidEdges = tempPrefix + "invalid_edges.csv";
    writeTempFile(invalidEdges, "source_id,destination_id,distance_meters\n0,1,-50\n");
    bool invalidDistOk = failMap.loadFromCSV(validNodesPath, invalidEdges);
    TEST_ASSERT(!invalidDistOk, "Reject negative distance in edges file");

    writeTempFile(invalidEdges, "source_id,destination_id,distance_meters\n0,1,0\n");
    bool zeroDistOk = failMap.loadFromCSV(validNodesPath, invalidEdges);
    TEST_ASSERT(!zeroDistOk, "Reject zero distance in edges file");
    removeTempFile(invalidEdges);

    // ----------------------------------------------------
    // TEST 13: Rejecting Edges Referencing Unknown Nodes
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 9: Unknown Node References in Edges ---\n";
    const std::string unknownNodeEdges = tempPrefix + "unknown_edges.csv";
    writeTempFile(unknownNodeEdges, "source_id,destination_id,distance_meters\n0,99,200\n");
    bool unknownNodeOk = failMap.loadFromCSV(validNodesPath, unknownNodeEdges);
    TEST_ASSERT(!unknownNodeOk, "Reject edge connecting to non-existent node 99");
    removeTempFile(unknownNodeEdges);

    // ----------------------------------------------------
    // TEST 14 & 15: Dijkstra Integration & Shortest Route Verification
    // ----------------------------------------------------
    std::cout << "\n--- Test Group 10: Dijkstra Integration & Route Translation ---\n";
    auto pathRes = CampusPath::Dijkstra::findShortestPath(campusMap.getGraph(), 0, 2);
    TEST_ASSERT(pathRes.found, "Dijkstra successfully solved route on loaded CampusMap");
    TEST_ASSERT(pathRes.totalDistance == 250.0,
                "Shortest distance from Main Gate (0) to Library (2) is 250 metres");

    std::vector<int> expectedIds = {0, 3, 2};
    TEST_ASSERT(pathRes.path == expectedIds, "Path sequence is [0 -> 3 -> 2]");

    // Route translation to readable names
    std::vector<std::string> names = campusMap.getPathLocationNames(pathRes);
    std::vector<std::string> expectedNames = {"Main Gate", "Canteen", "Library"};
    TEST_ASSERT(names == expectedNames,
                "Human-readable translation is ['Main Gate', 'Canteen', 'Library']");

    // Multi-hop test: Main Gate (0) to Admin Block (7)
    // 0 -> 1 (200) -> 6 (120) -> 7 (180) = 500m
    auto adminRes = CampusPath::Dijkstra::findShortestPath(campusMap.getGraph(), 0, 7);
    TEST_ASSERT(adminRes.found && adminRes.totalDistance == 500.0,
                "Shortest distance from Main Gate to Admin Block is 500 metres");
    std::vector<std::string> adminNames = campusMap.getPathLocationNames(adminRes);
    std::vector<std::string> expectedAdminNames = {"Main Gate", "CSE Block", "Academic Block", "Admin Block"};
    TEST_ASSERT(adminNames == expectedAdminNames,
                "Route to Admin Block is ['Main Gate', 'CSE Block', 'Academic Block', 'Admin Block']");

    // ----------------------------------------------------
    // FINAL SUMMARY
    // ----------------------------------------------------
    std::cout << "\n==================================================\n";
    std::cout << "  CampusMap Test Summary: " << passedCount << " Passed, " << failedCount << " Failed\n";
    std::cout << "==================================================\n";

    return (failedCount == 0) ? 0 : 1;
}
