const withProtocol = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const cleanId = (value?: string | null) => {
  if (!value) return null;
  const id = value.trim();
  return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
};

const youtubeEmbedUrl = (videoId: string) =>
  `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;

export const normalizeStreamUrl = (url?: string | null) => {
  if (!url) return null;

  const normalized = withProtocol(url);
  try {
    return new URL(normalized).toString();
  } catch (error) {
    return null;
  }
};

export const getStreamEmbedUrl = (url?: string | null) => {
  const normalizedUrl = normalizeStreamUrl(url);
  if (!normalizedUrl) return null;

  try {
    const parsed = new URL(normalizedUrl);
    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const videoId = cleanId(parsed.pathname.split('/').filter(Boolean)[0]);
      return videoId ? youtubeEmbedUrl(videoId) : null;
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const videoId =
        cleanId(parsed.searchParams.get('v')) ||
        cleanId(parsed.searchParams.get('vi'));
      if (videoId) return youtubeEmbedUrl(videoId);

      const parts = parsed.pathname.split('/').filter(Boolean);
      const idPrefixes = ['live', 'shorts', 'embed', 'v', 'e'];
      for (const prefix of idPrefixes) {
        const index = parts.findIndex((part) => part.toLowerCase() === prefix);
        const id = cleanId(index >= 0 ? parts[index + 1] : null);
        if (id) return youtubeEmbedUrl(id);
      }

      const channelIndex = parts.findIndex((part) => part.toLowerCase() === 'channel');
      const channelId = channelIndex >= 0 ? parts[channelIndex + 1] : null;
      if (channelId) {
        return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&autoplay=1&rel=0&playsinline=1`;
      }

      return null;
    }

    if (host.endsWith('facebook.com') || host.endsWith('fb.watch')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalizedUrl)}&show_text=false&autoplay=true`;
    }
  } catch (error) {
    return null;
  }

  return normalizedUrl;
};
