import { BASE_URL } from '../utils/config';
import { postNoise, getNoise, getUserNoiseHistory } from '../../shared/api/index.js';

export const api = {
  postNoise: (reading) => postNoise(BASE_URL, reading),
  getNoise: (params) => getNoise(BASE_URL, params),
  getUserNoiseHistory: () => getUserNoiseHistory(BASE_URL),
};
