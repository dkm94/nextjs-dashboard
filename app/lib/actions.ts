'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
 
// form validation
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    // Tip: If you're working with forms that have many fields, you may want to consider using the entries() method with JavaScript's Object.fromEntries(). For example:
    // const rawFormData = Object.fromEntries(formData.entries());

    const rawFormData = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    };

    // transform typeof amout === string into type number
    // because input elements with type="number" actually return a string, not a number!
    const { customerId, amount, status } = CreateInvoice.parse(rawFormData);
    const amountInCents = amount * 100; // store monetary value in cents to avoid floating point errors
    const date = new Date().toISOString().split('T')[0]; // get today's date in the format "YYYY-MM-DD"

    // Inserting the data into database
    await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;

    // As Next uses Client-side Router Cache (SWR) to store routes (user behaviour)
    // and prefectching to improve performance and user experience (prefetch data from the server before it's needed)
    // we'd like the previous data stored in the cache to be updated when we update an invoice.
    // To do this, we can use the revalidatePath() function from the next/cache module.
    // So when we get redirected to the invoice page, the data will be updated.
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}