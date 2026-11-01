#include "Graph.hpp"

namespace CampusPath {

bool Graph::addNode(const Node& node) {
    // Validation: Reject duplicate node IDs
    if (hasNode(node.id)) {
        return false;
    }

    // Store the node metadata
    nodes.emplace(node.id, node);

    // Initialize an empty adjacency list entry for this node
    adjList.emplace(node.id, std::vector<Edge>{});

    return true;
}

bool Graph::addEdge(int source, int destination, int distance) {
    // Validation 1: Reject zero or negative distances
    if (distance <= 0) {
        return false;
    }

    // Validation 2: Reject self-loops (cannot connect a location to itself)
    if (source == destination) {
        return false;
    }

    // Validation 3: Reject edges with non-existent source or destination IDs
    if (!hasNode(source) || !hasNode(destination)) {
        return false;
    }

    // Validation 4: Reject duplicate edges (edge already exists between these two nodes)
    if (hasEdge(source, destination)) {
        return false;
    }

    const double weight = static_cast<double>(distance);

    // Undirected graph: add the connection in BOTH directions
    adjList[source].emplace_back(destination, weight);
    adjList[destination].emplace_back(source, weight);

    return true;
}

const std::vector<Edge>& Graph::getNeighbors(int nodeId) const {
    // Static empty vector returned when the requested node ID does not exist.
    // This avoids throwing exceptions and prevents map modifications.
    static const std::vector<Edge> emptyNeighbors;

    // Using find() instead of operator[] guarantees const-safety
    // and prevents accidental insertion of default values into the map.
    auto it = adjList.find(nodeId);
    if (it != adjList.end()) {
        return it->second;
    }

    return emptyNeighbors;
}

bool Graph::hasNode(int nodeId) const {
    return nodes.find(nodeId) != nodes.end();
}

bool Graph::hasEdge(int source, int destination) const {
    auto it = adjList.find(source);
    if (it == adjList.end()) {
        return false;
    }

    // Check if an edge leads to the requested destination
    for (const auto& edge : it->second) {
        if (edge.destination == destination) {
            return true;
        }
    }

    return false;
}

const std::unordered_map<int, Node>& Graph::getNodes() const {
    return nodes;
}

size_t Graph::getNodeCount() const {
    return nodes.size();
}

size_t Graph::getEdgeCount() const {
    size_t totalDirectedEdges = 0;
    for (const auto& pair : adjList) {
        totalDirectedEdges += pair.second.size();
    }
    // Each undirected edge is stored twice (A -> B and B -> A)
    return totalDirectedEdges / 2;
}

} // namespace CampusPath
