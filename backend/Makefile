CXX := g++
CXXFLAGS := -std=c++17 -Wall -Wextra -pedantic -Iinclude
LDFLAGS := -pthread

# Directory paths
BIN_DIR := bin
BUILD_DIR := build
SRC_DIR := src
TEST_DIR := tests
INC_DIR := include

# Executables
TARGET := $(BIN_DIR)/campuspath
SERVER_TARGET := $(BIN_DIR)/campuspath_server

# Core library source and object files
CORE_SRCS := $(SRC_DIR)/Graph.cpp $(SRC_DIR)/Dijkstra.cpp $(SRC_DIR)/CampusMap.cpp
CORE_OBJS := $(patsubst $(SRC_DIR)/%.cpp,$(BUILD_DIR)/%.o,$(CORE_SRCS))

# Application objects
MAIN_OBJ := $(BUILD_DIR)/main.o
SERVER_OBJ := $(BUILD_DIR)/server.o

# Test targets
TEST_GRAPH_BIN := $(BIN_DIR)/test_graph
TEST_DIJKSTRA_BIN := $(BIN_DIR)/test_dijkstra
TEST_CAMPUS_MAP_BIN := $(BIN_DIR)/test_campus_map

TEST_BINS := $(TEST_GRAPH_BIN) $(TEST_DIJKSTRA_BIN) $(TEST_CAMPUS_MAP_BIN)

.PHONY: all run server run-server test clean

# Default target: compile the console application
all: $(TARGET)

# Compile the HTTP API server
server: $(SERVER_TARGET)

# Link the console executable
$(TARGET): $(MAIN_OBJ) $(CORE_OBJS) | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@

# Link the HTTP API server executable
$(SERVER_TARGET): $(SERVER_OBJ) $(CORE_OBJS) | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@ $(LDFLAGS)

# Compile core and main source files into objects
$(BUILD_DIR)/%.o: $(SRC_DIR)/%.cpp | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Compile test sources into objects
$(BUILD_DIR)/%.o: $(TEST_DIR)/%.cpp | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Create required directories
$(BIN_DIR) $(BUILD_DIR):
	mkdir -p $@

# Link individual test executables
$(TEST_GRAPH_BIN): $(BUILD_DIR)/test_graph.o $(BUILD_DIR)/Graph.o | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@

$(TEST_DIJKSTRA_BIN): $(BUILD_DIR)/test_dijkstra.o $(BUILD_DIR)/Graph.o $(BUILD_DIR)/Dijkstra.o | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@

$(TEST_CAMPUS_MAP_BIN): $(BUILD_DIR)/test_campus_map.o $(CORE_OBJS) | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $^ -o $@

# Run the console application
run: $(TARGET)
	./$(TARGET)

# Run the HTTP API server
run-server: $(SERVER_TARGET)
	./$(SERVER_TARGET)

# Compile and run all automated test suites
test: $(TEST_BINS)
	@echo "=========================================="
	@echo "  1/3 Running Graph Unit Tests..."
	@echo "=========================================="
	./$(TEST_GRAPH_BIN)
	@echo "\n=========================================="
	@echo "  2/3 Running Dijkstra Unit Tests..."
	@echo "=========================================="
	./$(TEST_DIJKSTRA_BIN)
	@echo "\n=========================================="
	@echo "  3/3 Running CampusMap Unit Tests..."
	@echo "=========================================="
	./$(TEST_CAMPUS_MAP_BIN)

# Remove build artifacts and generated binaries
clean:
	rm -rf $(BUILD_DIR) $(BIN_DIR)
	rm -f $(TEST_DIR)/test_graph $(TEST_DIR)/test_dijkstra $(TEST_DIR)/test_campus_map $(TEST_DIR)/test_shortest_path
	rm -f campuspath_app
