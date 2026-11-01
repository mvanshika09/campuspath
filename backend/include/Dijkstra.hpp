#pragma once

#include "Common.hpp"
#include "Graph.hpp"

namespace CampusPath {

/**
 * @class Dijkstra
 * @brief Computes shortest paths on a weighted campus graph using Dijkstra's Algorithm.
 * 
 * Features:
 * - Min-priority queue (std::priority_queue with std::greater) for optimal node selection.
 * - Lazy deletion to safely handle and skip outdated priority queue entries.
 * - Parent tracking to reconstruct the complete turn-by-turn route.
 * - Overflow-safe distance relaxation.
 * - Handles unreachable destinations and non-existent node IDs gracefully.
 */
class Dijkstra {
public:
    /**
     * @brief Calculates the shortest route between a source and destination location.
     * 
     * @param graph The campus graph containing nodes and weighted connections.
     * @param source The starting location's unique Node ID.
     * @param destination The destination location's unique Node ID.
     * @return PathResult containing route validity, ordered Node IDs, and total distance in metres.
     */
    static PathResult findShortestPath(const Graph& graph, int source, int destination);
};

} // namespace CampusPath
