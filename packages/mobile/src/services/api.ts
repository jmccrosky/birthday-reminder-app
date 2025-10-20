import axios from 'axios';

// Update this URL to match your Cloud Run deployment
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Birthday {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  notes?: string;
  notificationEnabled: boolean;
  notificationDaysBefore: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBirthdayData {
  name: string;
  birthDate: string;
  notes?: string;
  notificationEnabled?: boolean;
  notificationDaysBefore?: number;
}

export const birthdayApi = {
  getAll: async (): Promise<Birthday[]> => {
    const response = await api.get('/birthdays');
    return response.data.birthdays;
  },

  getById: async (id: string): Promise<Birthday> => {
    const response = await api.get(`/birthdays/${id}`);
    return response.data.birthday;
  },

  create: async (data: CreateBirthdayData): Promise<Birthday> => {
    const response = await api.post('/birthdays', data);
    return response.data.birthday;
  },

  update: async (id: string, data: Partial<CreateBirthdayData>): Promise<Birthday> => {
    const response = await api.put(`/birthdays/${id}`, data);
    return response.data.birthday;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/birthdays/${id}`);
  },
};

export const userApi = {
  updateDeviceToken: async (deviceToken: string): Promise<void> => {
    await api.post('/users/device-token', { deviceToken });
  },
};
