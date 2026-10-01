/** Response shapes returned by the API. Dates are ISO-8601 strings over the wire. */

export interface UserDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[] | undefined>;
  };
}
