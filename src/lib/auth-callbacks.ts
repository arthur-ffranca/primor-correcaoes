type SessionLike = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
};

type TokenLike = {
  sub?: string;
  id?: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
};

type UserLike = {
  id?: string;
  email?: string | null;
};

export const authCallbacks = {
  async jwt({ token, user }: { token: TokenLike; user?: UserLike | null }) {
    if (user?.id) {
      token.id = user.id;
      token.sub = user.id;
    }

    return token;
  },

  async session({ session, token }: { session: SessionLike; token: TokenLike }) {
    return {
      ...session,
      user: {
        ...session.user,
        id: token.id ?? token.sub,
      },
    };
  },
};
