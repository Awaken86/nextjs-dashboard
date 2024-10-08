'use server';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};
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
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: State, formData: FormData) {
    // Validate form using Zod
    const validatedFields = CreateInvoice.safeParse({
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

    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    // Insert data into the database
    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (err) {
        console.error('Database Error:', err);
        // If a database error occurs, return a more specific error.
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    // Revalidate the cache for the invoices page and redirect the user.
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}
/*************  ✨ Codeium Command ⭐  *************/
    /**
     * Updates an invoice in the database. First, validates the form data with Zod.
     * If the form validation fails, returns an object with an `errors` key
     * containing the validation errors and a `message` key explaining the failure.
     * If the form validation succeeds, updates the invoice in the database and
     * redirects the user to the invoices page.
     * @param id The id of the invoice to update.
     * @param prevState The previous state of the form.
     * @param formData The form data to validate and use for the update.
     * @returns An object with an `errors` key containing the validation errors and
     * a `message` key explaining the failure, or redirects the user to the
     * invoices page if the update is successful.
     */
/******  3261afe3-f59a-42e0-ab41-3b08cbda318d  *******/
export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData,
) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
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
    } catch (err) {
        console.error('Database Error:', err);
        return { message: 'Database Error: Failed to Update Invoice.' };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}
export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
        return { message: 'Deleted Invoice.' };
    } catch (err) {
        console.error('Database Error:', err);
        return { message: 'Database Error: Failed to Delete Invoice.' };
    }
}