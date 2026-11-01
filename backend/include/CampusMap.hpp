#pragma once

#include "Common.hpp"
#include "Graph.hpp"
#include <string>
#include <vector>
#include <unordered_map>

namespace CampusPath {

/**
 * @class CampusMap
 * @brief Manages campus locations and walking pathways loaded from CSV files.
 * 
 * Features:
 * - Transactional CSV loading (all-or-nothing: failures never leave the map corrupted).
 * - Fast lookup by location ID or human-readable name.
 * - Integration with the core Graph representation.
 * - Route translation from Node IDs to readable landmark names.
 * 
 * @note Limitation: Standard comma-separated parsing is used. Location names
 * containing embedded quoted commas are not supported in this initial version.
 */
class CampusMap {
private:
    Graph graph;
    std::unordered_map<int, Node> nodes;
    std::unordered_map<std::string, int> nameToId;
    std::string lastError;

public:
    /// Default constructor creating an empty campus map
    CampusMap() = default;

    /**
     * @brief Loads campus locations and connections from CSV files.
     * Transactional: if any file is missing, empty, or malformed, the map is
     * not modified and an error message is recorded in getLastError().
     * 
     * @param nodesFilePath Path to nodes.csv (id, name, category)
     * @param edgesFilePath Path to edges.csv (source_id, destination_id, distance_meters)
     * @return true if both files were successfully validated and loaded; false otherwise.
     */
    bool loadFromCSV(const std::string& nodesFilePath, const std::string& edgesFilePath);

    /**
     * @brief Returns a const reference to the underlying Graph object.
     */
    const Graph& getGraph() const;

    /**
     * @brief Returns all registered campus locations.
     */
    const std::unordered_map<int, Node>& getNodes() const;

    /**
     * @brief Finds a location by its unique integer ID.
     * @param id The location ID to search for.
     * @return Pointer to the Node if found; nullptr if not found.
     */
    const Node* getNodeById(int id) const;

    /**
     * @brief Finds a location by its human-readable name (exact match).
     * @param name The name to search for (e.g., "Library").
     * @return Pointer to the Node if found; nullptr if not found.
     */
    const Node* getNodeByName(const std::string& name) const;

    /**
     * @brief Converts an ordered vector of Node IDs into human-readable location names.
     * @param path Vector of Node IDs (e.g. from Dijkstra result).
     * @return Vector of location names.
     */
    std::vector<std::string> getPathLocationNames(const std::vector<int>& path) const;

    /**
     * @brief Convenience overload converting a PathResult into location names.
     * @param pathResult PathResult struct returned by Dijkstra.
     * @return Vector of location names.
     */
    std::vector<std::string> getPathLocationNames(const PathResult& pathResult) const;

    /**
     * @brief Returns the total number of loaded campus landmarks.
     */
    size_t getNodeCount() const;

    /**
     * @brief Returns the total number of loaded walking connections.
     */
    size_t getEdgeCount() const;

    /**
     * @brief Returns the last recorded error message (if any).
     */
    const std::string& getLastError() const;

    /**
     * @brief Checks whether the map has loaded data.
     */
    bool isEmpty() const;
};

} // namespace CampusPath
