import { petService } from "../services/index.js";

export const fetchAllPets = () => petService.fetchPets();
