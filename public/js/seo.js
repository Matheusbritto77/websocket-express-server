function setSeoMetaTags(title, description, keywords, image) {
    document.title = title;
    document.querySelector('meta[name="description"]').setAttribute("content", description);
    document.querySelector('meta[name="keywords"]').setAttribute("content", keywords);
    document.querySelector('meta[property="og:title"]').setAttribute("content", title);
    document.querySelector('meta[property="og:description"]').setAttribute("content", description);
    document.querySelector('meta[property="og:image"]').setAttribute("content", image);
    document.querySelector('meta[property="og:type"]').setAttribute("content", "website");
}

// Exemplo de uso
setSeoMetaTags(
    "Video Chat Seguro - Conecte-se Instantaneamente",
    "Conecte-se com pessoas de todo o mundo em uma plataforma de videochamada segura e rápida. Descubra novos amigos e mantenha contato com quem você gosta.",
    "video chat, chat de vídeo, chamadas de vídeo, videochamada segura, videoconferência, Omegle alternativa, bate-papo por vídeo, conectar pessoas, webcam chat, streaming ao vivo, vídeo em tempo real",
    "https://www.flaticon.com/br/icones-gratis/camera-de-video"
);
