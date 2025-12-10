# Gemini Image Studio

A beautiful, modern chat-based image generation and editing application powered by Google's Gemini 3 Pro Image model via OpenRouter API.

![Gemini Image Studio](https://img.shields.io/badge/Gemini-Image%20Studio-8B5CF6?style=for-the-badge)

## ✨ Features

- 🎨 **AI Image Generation** - Create stunning images from text descriptions
- ✏️ **Image Editing** - Upload and modify existing images through natural language
- 💬 **Chat Interface** - Intuitive conversation-based interaction
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🌙 **Dark Theme** - Beautiful modern dark UI design
- 📁 **Drag & Drop** - Easy image upload via drag and drop
- 💾 **Chat History** - Automatically saves your conversations locally
- ⚡ **Fast & Efficient** - Optimized performance with smooth animations

## 🚀 Quick Start

### 1. Get an API Key

1. Visit [OpenRouter](https://openrouter.ai/keys)
2. Create an account and generate an API key
3. Copy your API key (starts with `sk-or-v1-...`)

### 2. Run the App

Simply open `index.html` in your browser, or serve it with a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Using PHP
php -S localhost:8000
```

### 3. Configure Settings

1. Click the **Settings** button in the sidebar
2. Paste your OpenRouter API key
3. Select your preferred model
4. Start creating!

## 🎯 Usage

### Creating Images

Simply type a description of what you want to create:

- "Create a cyberpunk cityscape at night with neon lights"
- "Generate a serene Japanese garden with cherry blossoms"
- "Design a futuristic product concept"

### Editing Images

1. Click the 📷 button or drag & drop an image
2. Describe the changes you want:
   - "Make the sky more dramatic"
   - "Add a sunset in the background"
   - "Change the style to watercolor"
   - "Remove the person on the left"

### Tips

- Be specific and detailed in your descriptions
- Use the "Edit this" button to continue modifying generated images
- Check the suggestion cards for inspiration

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **API**: OpenRouter (Google Gemini 3 Pro Image Preview)
- **Fonts**: Sora, Space Mono (Google Fonts)
- **Storage**: LocalStorage for settings and chat history

## 📁 Project Structure

```
gemini-image/
├── index.html      # Main HTML structure
├── styles.css      # All styling (responsive)
├── app.js          # Application logic & API integration
└── README.md       # This file
```

## 🔧 Configuration

### Available Models

| Model | Description |
|-------|-------------|
| `google/gemini-3-pro-image-preview` | Best quality, supports image generation |
| `google/gemini-2.0-flash-exp:free` | Free tier, text-only responses |

### API Pricing

- **Input**: $2 per million tokens
- **Output**: $12 per million tokens
- **Images**: $120 per million tokens

See [OpenRouter pricing](https://openrouter.ai/google/gemini-3-pro-image-preview) for details.

## 🎨 Customization

### Changing Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --accent-primary: #8B5CF6;    /* Purple */
    --accent-secondary: #EC4899;   /* Pink */
    --accent-tertiary: #F59E0B;    /* Orange */
}
```

### Adding New Models

Update the model select in `index.html`:

```html
<select id="modelSelect">
    <option value="model-id">Model Name</option>
</select>
```

## 📱 Mobile Support

The app is fully responsive and works great on:
- iPhone / Android phones
- iPad / Android tablets
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## 🔒 Privacy

- Your API key is stored locally in your browser
- Chat history is saved locally (not sent to any server)
- Images are processed through OpenRouter's API
- No analytics or tracking

## 🐛 Troubleshooting

### "API Key Required" Error
Make sure you've entered your OpenRouter API key in Settings.

### Image Generation Not Working
- Verify your API key is valid
- Check that you have sufficient credits on OpenRouter
- Ensure you're using a model that supports image generation

### Slow Response
Image generation can take 10-30 seconds depending on complexity.

## 📄 License

MIT License - feel free to use and modify!

## 🙏 Credits

- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI Model
- [OpenRouter](https://openrouter.ai/) - API Provider
- [Google Fonts](https://fonts.google.com/) - Typography

---

Made with ❤️ for creative AI exploration

