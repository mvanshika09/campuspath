#pragma once

#include <string>
#include <vector>
#include <limits>

/**
 * @file Common.hpp
 * @brief Common data structures and constants for the CampusPath navigation system.
 * 
 * In Graph Theory (ADSA):
 * - A campus map is modeled as a weighted graph G = (V, E)
 * - V (Vertices/Nodes): Campus locations (e.g., Library, Cafeteria, Gates)
 * - E (Edges): Walkways or paths connecting locations, weighted by walking distance.
 */

namespace CampusPath {

/**
 * @brief Represents an unreachable distance or infinite weight.
 * Used during distance initialization in Dijkstra's Algorithm.
 */
constexpr double INF = std::numeric_limits<double>::infinity();

/**
 * @brief Represents a campus landmark or location (Graph Vertex).
 */
struct Node {
    int id;                 ///< Unique identifier for the location (e.g., 1, 2, 3)
    std::string name;       ///< Human-readable name (e.g., "Central Library")
    std::string category;   ///< Building type (e.g., "Academic", "Hostel", "Cafeteria", "Gate")

    /// Default constructor
    Node() : id(-1), name(""), category("") {}

    /// Parameterized constructor
    Node(int id, std::string name, std::string category)
        : id(id), name(std::move(name)), category(std::move(category)) {}
};

/**
 * @brief Represents a walking path connecting two locations (Graph Edge).
 * 
 * In an Adjacency List, each Node maintains a list of outgoing Edges.
 */
struct Edge {
    int destination;        ///< ID of the neighboring node this path leads to
    double distance;        ///< Walking distance in metres (edge weight >= 0)

    /// Default constructor
    Edge() : destination(-1), distance(0.0) {}

    /// Parameterized constructor
    Edge(int destination, double distance)
        : destination(destination), distance(distance) {}
};

/**
 * @brief Stores the outcome of a shortest path query (Dijkstra's Algorithm output).
 */
struct PathResult {
    bool found;                  ///< True if a valid path exists between source and destination
    std::vector<int> path;       ///< Ordered sequence of node IDs from start to destination
    double totalDistance;        ///< Total walking distance in metres

    /// Default constructor for an unsuccessful search
    PathResult() : found(false), totalDistance(0.0) {}

    /// Parameterized constructor for a completed search
    PathResult(bool found, std::vector<int> path, double totalDistance)
        : found(found), path(std::move(path)), totalDistance(totalDistance) {}
};

} // namespace CampusPath
