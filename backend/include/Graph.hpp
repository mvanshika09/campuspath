#pragma once

#include "Common.hpp"
#include <unordered_map>
#include <vector>

namespace CampusPath {

/**
 * @class Graph
 * @brief Represents a weighted, undirected campus map using an Adjacency List.
 * 
 * - Vertices represent physical campus locations (Node).
 * - Edges represent bidirectional walkways connecting locations with distances in metres.
 */
class Graph {
private:
    /// Adjacency List: maps a Node ID to the list of its connected Edges
    std::unordered_map<int, std::vector<Edge>> adjList;

    /// Node Table: maps a Node ID to its Node metadata (id, name, category)
    std::unordered_map<int, Node> nodes;

public:
    /// Default constructor
    Graph() = default;

    /**
     * @brief Adds a new campus location to the graph.
     * @param node The Node object containing id, name, and category.
     * @return true if the node was added; false if a node with this ID already exists.
     */
    bool addNode(const Node& node);

    /**
     * @brief Adds a bidirectional, weighted walkway between two existing locations.
     * @param source Node ID of the first location.
     * @param destination Node ID of the second location.
     * @param distance Walking distance in metres (must be strictly positive).
     * @return true if the edge was added; false if validation fails.
     */
    bool addEdge(int source, int destination, int distance);

    /**
     * @brief Returns all directly connected neighbours for a given location.
     * Safe query: does NOT modify the graph or insert keys if nodeId is missing.
     * @param nodeId ID of the node to query.
     * @return const reference to the vector of neighboring Edges.
     */
    const std::vector<Edge>& getNeighbors(int nodeId) const;

    /**
     * @brief Checks whether a location with the specified ID exists in the graph.
     * @param nodeId ID of the node to check.
     * @return true if the node exists, false otherwise.
     */
    bool hasNode(int nodeId) const;

    /**
     * @brief Checks whether a direct connection exists between two locations.
     * @param source Node ID of the first location.
     * @param destination Node ID of the second location.
     * @return true if a direct edge exists, false otherwise.
     */
    bool hasEdge(int source, int destination) const;

    /**
     * @brief Returns all registered campus locations.
     * @return const reference to the map of all Nodes.
     */
    const std::unordered_map<int, Node>& getNodes() const;

    /**
     * @brief Returns the total count of locations (vertices) in the graph.
     */
    size_t getNodeCount() const;

    /**
     * @brief Returns the total count of undirected connections (edges) in the graph.
     */
    size_t getEdgeCount() const;
};

} // namespace CampusPath
