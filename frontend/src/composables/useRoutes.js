import { ref } from "vue";
import { useDataStore } from "@/store/data";

export function useRoutes() {
  const dataStore = useDataStore();

  const graph = ref(new Map());

  function addLocation(name) {
    if (!graph.value.has(name)) {
      graph.value.set(name, []);
    }
  }

  function addRoute(from, to, distance, requirement = null) {
    if (!graph.value.has(from)) addLocation(from);
    if (!graph.value.has(to)) addLocation(to);

    graph.value.get(from).push({
      to,
      distance,
      requirement,
    });
  }

  dataStore.locations.forEach(({ id }) => addLocation(id));
  dataStore.routes.forEach((route) => {
    const { locations, options, distance, distanceModifier } = route;
    const [from, to] = locations;
    const dist = Math.floor(distance * distanceModifier);
    const reqs = options.flatMap(({ terrainModifiers }) => terrainModifiers);

    addRoute(from, to, dist, reqs);
    addRoute(to, from, dist, reqs);
  });

  const getRoute = (start, goal) => {
    if (!graph.value.has(start)) {
      console.log(`${start} not in map`);
      return;
    }
    if (!graph.value.has(goal)) {
      console.log(`${goal} not in map`);
      return;
    }

    const distances = new Map();
    const prev = new Map();
    const queue = new Set();

    for (const id of graph.value.keys()) {
      distances.set(id, Infinity);
      prev.set(id, null);
      queue.add(id);
    }
    distances.set(start, 0);

    while (queue.size) {
      // find node with smallest distance
      const current = [...queue].reduce((a, b) =>
        distances.get(a) < distances.get(b) ? a : b
      );

      queue.delete(current);
      if (current === goal) break;

      for (const edge of graph.value.get(current) || []) {
        // if (edge.requirement && !edge.requirement.canTravel?.(userState))
        //   continue;

        const alt = distances.get(current) + edge.distance;
        if (alt < distances.get(edge.to)) {
          distances.set(edge.to, alt);
          prev.set(edge.to, current);
        }
      }
    }

    if (distances.get(goal) === Infinity) return null;

    // reconstruct path
    const path = [];
    let u = goal;
    while (u) {
      const temp = u;
      u = prev.get(u);
      const dist = distances.get(temp) - distances.get(u) || 0;
      path.unshift([temp, dist]);
    }
    return path;
  };

  return {
    getRoute,
  };
}
