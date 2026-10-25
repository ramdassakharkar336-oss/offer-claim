// ✅ Service Worker इंस्टॉल होने पर
self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
});

// ✅ फाइलें कैश करने के लिए (ताकि तेज़ चले)
self.addEventListener('fetch', (e) => {
  // यह फिलहाल बैकग्राउंड में काम करेगा
});