#include "Dijkstra.hpp"
#include <queue>
#include <unordered_map>
#include <algorithm>

namespace CampusPath {

PathResult Dijkstra::findShortestPath(const Graph& graph, int source, int destination) {
    // Validation 1: Source and destination must exist in the graph
    if (!graph.hasNode(source) || !graph.hasNode(destination)) {
        return PathResult(false, {}, 0.0);
    }

    // Special Case: Source is already the destination
    if (source == destination) {
        return PathResult(true, {source}, 0.0);
    }

    // Distance map: stores the shortest known distance from source to each node
    std::unordered_map<int, double> dist;

    // Parent map: stores the predecessor node along the shortest path
    std::unordered_map<int, int> parent;

    // Initialize all distances to infinity (INF) and parents to -1
    for (const auto& [nodeId, _] : graph.getNodes()) {
        dist[nodeId] = INF;
        parent[nodeId] = -1;
    }

    // Distance from source to itself is 0
    dist[source] = 0.0;

    // Min-Priority Queue stores pairs of (distance, nodeId).
    // Using std::greater ensures the pair with the smallest tentative distance is popped first.
    using QueueElement = std::pair<double, int>;
    std::priority_queue<QueueElement, std::vector<QueueElement>, std::greater<QueueElement>> pq;

    pq.emplace(0.0, source);

    while (!pq.empty()) {
        auto [currentDist, u] = pq.top();
        pq.pop();

        // Stale entry check (Lazy Deletion):
        // If the extracted distance is greater than the recorded shortest distance to u,
        // it means we already relaxed u via a shorter route earlier. Discard it.
        if (currentDist > dist[u]) {
            continue;
        }

        // Early exit optimization:
        // When the destination node is extracted from the min-heap, its shortest distance is finalized.
        if (u == destination) {
            break;
        }

        // Relax all outgoing edges from node u
        for (const auto& edge : graph.getNeighbors(u)) {
            int v = edge.destination;
            double weight = edge.distance;

            // Safe relaxation:
            // Ensure currentDist is finite (prevents overflow) and candidate path is strictly shorter
            if (currentDist != INF && currentDist + weight < dist[v]) {
                dist[v] = currentDist + weight;
                parent[v] = u;
                pq.emplace(dist[v], v);
            }
        }
    }

    // If destination distance is still INF, destination is unreachable from source
    if (dist[destination] == INF) {
        return PathResult(false, {}, 0.0);
    }

    // Path Reconstruction: Backtrack from destination to source using parent pointers
    std::vector<int> path;
    for (int curr = destination; curr != -1; curr = parent[curr]) {
        path.push_back(curr);
        if (curr == source) {
            break;
        }
    }

    // Backtracking yields destination -> ... -> source.
    // Reverse the vector to produce source -> ... -> destination.
    std::reverse(path.begin(), path.end());

    // Sanity check: reconstructed path must start at source and end at destination
    if (path.empty() || path.front() != source || path.back() != destination) {
        return PathResult(false, {}, 0.0);
    }

    return PathResult(true, path, dist[destination]);
}

} // namespace CampusPath
