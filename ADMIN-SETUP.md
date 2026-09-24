# KCA website — admin panel setup

The admin panel lives at **/admin** (for example `https://your-site.vercel.app/admin`).
Only people with a confirmed **@kca.org.ua** email can sign in and edit.

It uses **Supabase** (free) for accounts, saved edits and uploaded photos.
Setup takes about 10 minutes and is done once.

## 1. Create the Supabase project
1. Go to https://supabase.com, sign up, and click **New project** (any name, e.g. `kca-website`; pick the region closest to Kyiv, e.g. Frankfurt).
2. When it's ready, open **SQL Editor → New query**, paste everything from `supabase/setup.sql`, and click **Run**.
   This creates the content table, the photo storage, and the rule that only @kca.org.ua addresses can register or edit.

## 2. Turn on email confirmation (this is what proves the email exists)
1. **Authentication → Sign In / Providers → Email**: make sure **Email** is enabled and **Confirm email** is ON.
2. **Authentication → URL Configuration**:
   - **Site URL**: your live address, e.g. `https://kca-website.vercel.app`
   - **Redirect URLs**: add `https://kca-website.vercel.app/admin` and `https://kca-website.vercel.app/admin/`
3. Recommended: **Authentication → Emails → SMTP Settings** — connect the school's email (Google Workspace / Microsoft 365) or a service like Resend.
   Supabase's built-in sender only allows a few emails per hour and often lands in spam.

## 3. Connect the website
1. In Supabase open **Project Settings → API** (or **Data API**). Copy:
   - **Project URL**
   - **anon / public** key
2. Open `assets/js/cms-config.js` and paste them in:
   ```js
   supabaseUrl: 'https://xxxx.supabase.co',
   supabaseAnonKey: 'eyJhbGciOi...',
   ```
3. Publish again (`npx vercel --prod`).

## 4. First sign-in
1. Go to `/admin` → **Create an account** with your @kca.org.ua email and a password.
2. Open the confirmation email and click the link. (No working mailbox = no account.)
3. Sign in → the website opens in **edit mode**.

## Editing
- **Text**: click any text and type. Press **Enter** or click elsewhere to save (Shift+Enter = new line, Esc = cancel).
- **Photos**: click a photo (a blue "Click to replace photo" label appears) and pick a file from your computer.
- **Same text in several places** (footer, menu, prices, buttons) changes everywhere at once.
  Use **Change only here** in the small black bar if you want to change just one spot.
- **Email addresses and phone numbers**: change one and you'll be asked to update it on every page (text and links).
- **Reset** puts a piece of text back to the original.
- **Preview** hides the editing outlines; **Sign out** leaves edit mode.
- Changes go live immediately for all visitors.
