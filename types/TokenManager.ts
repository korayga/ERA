export class TokenManager {
  private static idToken: string | null = null;

  static setIdToken(token: string | null) {
    this.idToken = token;
  }

  static getIdToken(): string | null {
    return this.idToken;
  }
}
