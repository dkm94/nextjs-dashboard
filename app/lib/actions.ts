'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};
 
// form validation --- these functions equal "required"
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
        .number()
        .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

// prevState - initial state's form -- required prop.
export async function createInvoice(prevState: State, formData: FormData) {
    // Tip: If you're working with forms that have many fields, you may want to consider using the entries() method with JavaScript's Object.fromEntries(). For example:
    // const rawFormData = Object.fromEntries(formData.entries());

    // transform typeof amout === string into type number
    // because input elements with type="number" actually return a string, not a number!
    const validatedFields = CreateInvoice.safeParse({ //safeParse() returns a result object with a success property that indicates whether the parsing was successful or not + data object.
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

      // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100; // store monetary value in cents to avoid floating point errors
    const date = new Date().toISOString().split('T')[0]; // get today's date in the format "YYYY-MM-DD"

    try {
        // Inserting the data into database
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    // As Next uses Client-side Router Cache (SWR) to store routes (user behaviour)
    // and prefectching to improve performance and user experience (prefetch data from the server before it's needed)
    // we'd like the previous data stored in the cache to be updated when we update an invoice.
    // To do this, we can use the revalidatePath() function from the next/cache module.
    // So when we get redirected to the invoice page, the data will be updated.
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData,
  ){
    const rawFormData = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    };
    const validatedFields = UpdateInvoice.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    try {
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
    `;
    } catch (error) {
        return { message: 'Database Error: Failed to Update Invoice.' }
    }
 
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
} 

export async function deleteInvoice(id: string){
    // throw new Error('Failed to Delete Invoice');
    try {
        await sql`
        DELETE FROM invoices
        WHERE id = ${id}
    `;
    revalidatePath('/dashboard/invoices');
    return { message: "Invoice deleted successfully"}
    } catch (error) {
        return {
            message: 'Database Error: Failed to Delete Invoice.'
        }
    }
}