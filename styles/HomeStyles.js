import { StyleSheet, Platform } from "react-native"

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333333",
  },

  // Header Styles - Sin línea divisoria
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 10 : 0,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333333",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    backgroundColor: "#F5F5F5",
  },

  // Welcome Section
  welcomeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333333",
  },
  userName: {
    fontWeight: "bold",
    color: "#6C63FF",
  },

  // Filters
  filtersContainer: {
    marginBottom: 10,
  },
  filtersScrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: "#F5F5F5",
  },
  activeFilterChip: {
    backgroundColor: "#6C63FF",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 6,
    color: "#333333",
  },
  activeFilterChipText: {
    color: "#FFFFFF",
  },

  // Section Styles
  sectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
  },
  parkingCount: {
    fontSize: 14,
    color: "#666666",
  },

  // Parking List
  parkingListContent: {
    paddingBottom: 20,
  },
  parkingCard: {
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  parkingCardContent: {
    padding: 15,
  },
  parkingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  parkingName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
    flex: 1,
  },
  parkingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#6C63FF20",
  },
  parkingBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6C63FF",
  },
  parkingDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  parkingDetail: {
    flexDirection: "row",
    alignItems: "center",
  },
  parkingDetailText: {
    fontSize: 13,
    color: "#ffffff",
    marginLeft: 5,
  },
  freeText: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 5,
  },

  // Reserve Button
  reserveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6C63FF",
    borderRadius: 8,
    paddingVertical: 10,
  },
  reserveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  buttonIcon: {
    marginLeft: 8,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },

  // Theme Styles
  darkTheme: {
    background: {
      backgroundColor: "#0A1520",
    },
    text: {
      color: "#FFFFFF",
    },
    subText: {
      color: "#CCCCCC",
    },
    card: {
      backgroundColor: "#070F18",
      borderColor: "#333333",
    },
    iconButton: {
      backgroundColor: "#333333",
    },
    filterChip: {
      backgroundColor: "#333333",
    },
  },
  lightTheme: {
    background: {
      backgroundColor: "#FFFFFF",
    },
    text: {
      color: "#333333",
    },
    subText: {
      color: "#666666",
    },
    card: {
      backgroundColor: "#FFFFFF",
      borderColor: "#E0E0E0",
    },
    iconButton: {
      backgroundColor: "#F5F5F5",
    },
    filterChip: {
      backgroundColor: "#F5F5F5",
    },
  },
})

export default styles
