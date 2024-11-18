const API_URL = process.env.REACT_APP_API_URL || '/api';

// API client with interceptors and token handling
class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 errors with token refresh
      if (response.status === 401 && this.refreshToken) {
        const newToken = await this.refreshToken();
        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
          return this.request(endpoint, options);
        }
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.token = data.token;
      localStorage.setItem('token', data.token);
      return data.token;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return null;
    }
  }

  // Auth methods
  async login(credentials) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    this.setTokens(data.token, data.refreshToken);
    return data;
  }

  async loginWithGoogle(token) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    this.setTokens(data.token, data.refreshToken);
    return data;
  }

  async getUserProfile() {
    return this.request('/user/profile');
  }

  setTokens(token, refreshToken) {
    this.token = token;
    this.refreshToken = refreshToken;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
}

export const fetchProducts = async (params) => {
  try {
    const queryString = new URLSearchParams({
      page: params.page,
      limit: params.limit,
      search: params.search,
      sort: params.sort,
      category: params.category,
      minPrice: params.filters?.minPrice,
      maxPrice: params.filters?.maxPrice,
      brands: params.filters?.brands?.join(','),
      inStock: params.filters?.inStock,
    }).toString();

    const response = await fetch(`/api/products?${queryString}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const apiClient = new ApiClient();