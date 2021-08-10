import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import { 
  Casefold, 
  Collection, 
  Get, 
  Index, 
  Match, 
  Ref, 
  Update 
} from 'faunadb';
import { fauna } from '../../services/fauna';
import { stripe } from '../../services/stripe';

type User = {
  ref: {
    id: string;
  },
  data: {
    stripe_customer_id: string;
  }
};

const handleSubscribe = async (req: NextApiRequest, res: NextApiResponse) => {
  if(req.method === 'POST') {
    const session = await getSession({ req });

    const user = await fauna.query<User>(
      Get(
        Match(Index('user_by_email'), Casefold(session.user.email))
      )
    );

    let stripeCustomerId = user.data.stripe_customer_id;

    if(!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: session.user.email
      });
  
      await fauna.query(
        Update(
          Ref(Collection('users'), user.ref.id),
          {
            data: {
              stripe_customer_id: stripeCustomer.id
            }
          }
        )
      );

      stripeCustomerId = stripeCustomer.id;
    }

    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        { 
          price: 'price_1JKleIKaiyQqtXk7vrHIZkn3', 
          quantity: 1 
        }
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL
    });

    return res.status(200).json({ sessionId: stripeCheckoutSession.id });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method not allowed');
  }
};

export default handleSubscribe;