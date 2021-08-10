import NextAuth from 'next-auth';
import Providers from 'next-auth/providers';
import { 
  Create, 
  Collection, 
  If, 
  Exists, 
  Match, 
  Index, 
  Casefold, 
  Get 
} from 'faunadb';

import { fauna } from '../../../services/fauna';

export default NextAuth({
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scope: 'read:user'
    })
  ],
  callbacks: {
    async signIn(user, account, profile) {
      const { email } = user;

      try {
        await fauna.query(
          If(
            // Condition
            Exists(
              Match(Index('user_by_email'), Casefold(email))
            ),
            // Then
            Get(
              Match(Index('user_by_email'), Casefold(email))
            ),
            // Else
            Create(
              Collection('users'),
              { data: { email } }
            )
          )
        );

        return true;
      } catch(ex) {
        console.error(ex);
        return false;
      }
    }
  }
});