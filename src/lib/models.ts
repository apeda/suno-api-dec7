export interface AudioInfo {
    id: string; // Unique identifier for the audio
    title?: string; // Title of the audio
    image_url?: string; // URL of the image associated with the audio
    lyric?: string; // Lyrics of the audio
    audio_url?: string; // URL of the audio file
    video_url?: string; // URL of the video associated with the audio
    created_at: string; // Date and time when the audio was created
    model_name: string; // Name of the model used for audio generation
    gpt_description_prompt?: string; // Prompt for GPT description
    prompt?: string; // Prompt for audio generation
    status: string; // Status
    type?: string;
    tags?: string; // Genre of music.
    negative_tags?: string; // Negative tags of music.
    duration?: string; // Duration of the audio
    error_message?: string; // Error message if any
    task_id?: string
};