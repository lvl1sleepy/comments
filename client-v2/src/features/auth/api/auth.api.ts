import { graphqlRequest } from "../../../api/graphql";

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResponse {
  login: {
    accessToken: string;
    user: {
      id: string;
      username: string;
    };
  };
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  register: {
    id: string;
    username: string;
  };
}

const REGISTER = `
  mutation Register(
    $username: String!
    $email: String!
    $password: String!
  ) {
    register(
      username: $username
      email: $email
      password: $password
    ) {
      id
      username
    }
  }
`;

const LOGIN = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      user {
        id
        username
      }
    }
  }
`;

export function login(input: LoginInput): Promise<LoginResponse> {
  return graphqlRequest<LoginResponse>(LOGIN, input);
}

export function register(input: RegisterInput): Promise<RegisterResponse> {
  return graphqlRequest<RegisterResponse>(REGISTER, input);
}
