import axios from 'axios';
import { GoogleGenAI, Type } from "@google/genai";

const api = axios.create({
  baseURL: '/api'
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const getAccounts = async () => {
  const response = await api.get('/accounts');
  return response.data;
};

export const createAccount = async (data: any) => {
  const response = await api.post('/accounts', data);
  return response.data;
};

export const updateAccount = async (id: string | number, data: any) => {
  const response = await api.put(`/accounts/${id}`, data);
  return response.data;
};

export const geocodeAddress = async (address: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the latitude and longitude for this address: "${address}". 
      If multiple exists, pick the most relevant one in the Philippines. 
      Respond ONLY with a JSON object containing keys "lat" and "lng". 
      Provide the coordinates with maximum precision (ideally 14 decimal places).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["lat", "lng"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Geocoding failed:", error);
    throw error;
  }
};
