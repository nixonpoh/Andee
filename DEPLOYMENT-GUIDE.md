# 🚀 How to Deploy Andee to Vercel (Non-Technical Guide)

## What You'll Need
- A GitHub account (free)
- A Vercel account (free)
- 15 minutes

---

## Step 1: Create a GitHub Account (if you don't have one)

1. Go to **github.com**
2. Click "Sign up"
3. Follow the steps (choose a username, email, password)
4. Verify your email

---

## Step 2: Upload Andee to GitHub

### Option A: Using GitHub Desktop (Easiest for Non-Technical)

1. **Download GitHub Desktop**
   - Go to: https://desktop.github.com
   - Download and install it

2. **Sign in to GitHub Desktop**
   - Open GitHub Desktop
   - Click "Sign in to GitHub.com"
   - Enter your GitHub credentials

3. **Create a New Repository**
   - Click "File" → "New Repository"
   - Name it: `andee-app`
   - Choose where to save it on your computer
   - Click "Create Repository"

4. **Add Andee Files**
   - Open the folder where you saved the repository
   - Copy ALL the files from the `andee-app` folder I created into this folder
   - Go back to GitHub Desktop
   - You'll see all the files listed as "changes"
   - In the bottom left, type: "Initial commit"
   - Click "Commit to main"
   - Click "Publish repository" at the top
   - Make sure "Keep this code private" is UNCHECKED (so Vercel can access it)
   - Click "Publish Repository"

### Option B: Using GitHub Website (Alternative)

1. Go to **github.com** and sign in
2. Click the **"+"** button (top right) → "New repository"
3. Name it: `andee-app`
4. Make it **Public**
5. Click "Create repository"
6. Click "uploading an existing file"
7. Drag and drop ALL files from the `andee-app` folder
8. Click "Commit changes"

---

## Step 3: Deploy to Vercel

1. **Create Vercel Account**
   - Go to: https://vercel.com
   - Click "Sign Up"
   - Choose "Continue with GitHub"
   - Authorize Vercel to access your GitHub

2. **Import Your Project**
   - You'll see a dashboard
   - Click "Add New..." → "Project"
   - You'll see a list of your GitHub repositories
   - Find `andee-app` and click "Import"

3. **Configure & Deploy**
   - Vercel will auto-detect it's a Next.js app
   - **Don't change any settings**
   - Just click "Deploy"
   - Wait 2-3 minutes while it builds

4. **Get Your Live URL**
   - Once deployed, you'll see: "🎉 Congratulations!"
   - You'll get a URL like: `andee-app-xxxxx.vercel.app`
   - Click "Visit" to see your live app!

---

## Step 4: Test Your App

1. Open the Vercel URL on your phone
2. Click the microphone button
3. Say "push by 15 minutes"
4. It should respond!

**Important**: Make sure you're using Chrome, Edge, or Safari (not Firefox) because the voice features need Web Speech API.

---

## Updating Your App Later

When you want to make changes:

### Using GitHub Desktop:
1. Edit your files locally
2. Open GitHub Desktop
3. It will show your changes
4. Type a description like "Updated feature X"
5. Click "Commit to main"
6. Click "Push origin"
7. Vercel will automatically rebuild and deploy (takes 2-3 min)

---

## Troubleshooting

**Problem**: "Build failed" on Vercel
- **Solution**: Make sure you uploaded ALL files, including package.json

**Problem**: Voice doesn't work
- **Solution**: Use Chrome, Edge, or Safari browser (not Firefox)

**Problem**: Can't find my GitHub repo in Vercel
- **Solution**: Make sure the repo is Public, not Private

---

## Next Steps (After Deployment Works)

Once your app is live, we can add:
1. ✅ Real Google Calendar integration
2. ✅ Real SMS notifications (Twilio)
3. ✅ Custom domain (optional)

---

## Need Help?

If you get stuck on any step, just tell me:
- Which step number you're on
- What you see on your screen
- Any error messages

I'll walk you through it! 🎯
