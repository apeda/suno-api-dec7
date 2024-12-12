import pino from 'pino';
import { AudioInfo } from './models';

const logger = pino();

export enum Models {
  V3_5 = "chirp-v3-5",
  V4 = "chirp-v4",
  V3_0 = "chirp-v3-0",
  V2 = "chirp-v2-xxl-alpha"
}

export enum Actions {
  generate = "generate",
  extend = "extend"
}

export type GenerateTask = {
  task_id: string;
  success?: boolean;
  audios?: AudioInfo[];
}

export type AudioPayload = {
  action: Actions;
  prompt?: string;
  model?: Models;
  lyric?: string;
  custom?: boolean;
  instrumental?: boolean;
  title?: string;
  style?: string;
  audio_id?: string;
  continue_at?: string;
}

export type GenerateTaskPayload = AudioPayload & {
  callback_url: string
}

export type Lyric = {
  title: string,
  text: string,
}

// https://platform.acedata.cloud/documents/b0dd9823-0e01-4c75-af83-5a6e2e05bfed

class AceDataSunoApi {
  private currentToken: string;
  private aceDataApiUrl: string;
  private apiUrl: string;

  constructor(currentToken: string, aceDataApiUrl: string, apiUrl: string) {
    this.currentToken = currentToken;
    this.aceDataApiUrl = aceDataApiUrl;
    this.apiUrl = apiUrl;
  }

  /**
   * Generate a song based on the prompt.
   * @param prompt The text prompt to generate audio from.
   * @param make_instrumental Indicates if the generated audio should be instrumental.
   * @param wait_audio Indicates if the method should wait for the audio file to be fully generated before returning.
   * @returns
   */
  public async generate(
    prompt: string,
    make_instrumental: boolean = false,
    model?: string,
  ): Promise<AudioInfo[]> {
    const payload: AudioPayload = {
      action: Actions.generate,
      custom: false,
      prompt: prompt,
      instrumental: make_instrumental,
      model: model as Models
    }
    
    return await this.generateSong(payload);
  }

  public async generate_task(
    prompt: string,
    make_instrumental: boolean = false,
    model?: string,
  ): Promise<string[]> {
    const payload: GenerateTaskPayload = {
      action: Actions.generate,
      custom: false,
      prompt: prompt,
      instrumental: make_instrumental,
      model: model as Models,
      callback_url: `${this.apiUrl}/task_completed`
    }

    const result = await this.post('/audios', payload);
    
    return result.task_id;
  }

  /**
   * Generates custom audio based on provided parameters.
   *
   * @param prompt The text prompt to generate audio from.
   * @param tags Tags to categorize the generated audio.
   * @param title The title for the generated audio.
   * @param make_instrumental Indicates if the generated audio should be instrumental.
   * @param wait_audio Indicates if the method should wait for the audio file to be fully generated before returning.
   * @param negative_tags Negative tags that should not be included in the generated audio.
   * @returns A promise that resolves to an array of AudioInfo objects representing the generated audios.
   */
  public async custom_generate(
    prompt: string,
    tags: string,
    title: string,
    make_instrumental: boolean = false,
    model?: string
  ): Promise<AudioInfo[]> {
    const payload: AudioPayload = {
      action: Actions.generate,
      custom: true,
      style: tags,
      title: title,
      lyric: prompt,
      instrumental: make_instrumental,
      model: model as Models
    }
    
    return await this.generateSong(payload);
  }

  public async custom_generate_task(
    prompt: string,
    tags: string,
    title: string,
    make_instrumental: boolean = false,
    model?: string
  ): Promise<string[]> {
    const payload: GenerateTaskPayload = {
      action: Actions.generate,
      custom: true,
      style: tags,
      title: title,
      lyric: prompt,
      instrumental: make_instrumental,
      model: model as Models,
      callback_url: `${this.apiUrl}/task_completed`
    }

    const result = await this.post('/audios', payload);
    
    return result.task_id;
  }

  public async get_task(task_id: string): Promise<GenerateTask> {
    const result = await this.post('/tasks', { id: task_id, action: 'retrieve' });
    
    return {
      task_id: result.response.task_id,
      success: result.response.success ?? false,
      audios: result.response.data?.map((audio: any) => {
        return {
          id: audio.id,
          title: audio.title,
          image_url: audio.image_url,
          lyric: this.parseLyrics(audio.lyric),
          audio_url: audio.audio_url,
          video_url: audio.video_url, 
          created_at: audio.created_at, 
          model_name: audio.model,
          prompt: audio.prompt,
          status: audio.state,
          tags: audio.style,
          duration: audio.duration,
          task_id: result.task_id
        };
      })
    };
  }

  /**
   * Generates lyrics based on a given prompt.
   * @param prompt The prompt for generating lyrics.
   * @returns The generated lyrics text.
   */
  public async generateLyrics(prompt: string): Promise<Lyric> {
    // Initiate lyrics generation

    const result = await this.post('/lyrics', { prompt });
    
    // Return the generated lyrics text
    return {
      ...result.data
    }
  }

  /**
   * Extends an existing audio clip by generating additional content based on the provided prompt.
   *
   * @param audioId The ID of the audio clip to extend.
   * @param prompt The prompt for generating additional content.
   * @param continueAt Extend a new clip from a song at mm:ss(e.g. 00:30). Default extends from the end of the song.
   * @param tags Style of Music.
   * @param title Title of the song.
   * @returns A promise that resolves to an AudioInfo object representing the extended audio clip.
   */
  public async extendAudio(
    audioId: string,
    prompt: string = '',
    continueAt: string = '0',
    tags: string = '',
    title: string = '',
    model?: string
  ): Promise<AudioInfo> {
    const payload: AudioPayload = {
      action: Actions.extend,
      audio_id: audioId,
      custom: true,
      style: tags,
      title: title,
      prompt: prompt,
      model: model as Models,
      continue_at: continueAt,
    }
    
    const songs = await this.generateSong(payload);

    return songs[0];
  }

  private parseLyrics(prompt: string): string {
    // Assuming the original lyrics are separated by a specific delimiter (e.g., newline), we can convert it into a more readable format.
    // The implementation here can be adjusted according to the actual lyrics format.
    // For example, if the lyrics exist as continuous text, it might be necessary to split them based on specific markers (such as periods, commas, etc.).
    // The following implementation assumes that the lyrics are already separated by newlines.

    // Split the lyrics using newline and ensure to remove empty lines.
    const lines = prompt.split('\n').filter((line) => line.trim() !== '');

    // Reassemble the processed lyrics lines into a single string, separated by newlines between each line.
    // Additional formatting logic can be added here, such as adding specific markers or handling special lines.
    return lines.join('\n');
  }

  private async post(path: string, payload: any): Promise<any> {
    const requestUrl = `${this.aceDataApiUrl}${path}`;
    
    logger.info('Payload: ' + JSON.stringify(payload));
    logger.info('Request Url: ' + requestUrl);

    const options = {
      method: "post",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${this.currentToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    };
    
    let response: Response;

    try {
      response = await fetch(requestUrl, options);
    }
    catch (error) {
      logger.info('Request Url: ' + requestUrl
        + '; Response Error: ' + JSON.stringify(error)
      );
      throw error;
    }
    
    if (response.status !== 200) {
      throw new Error('Error response:' + response.statusText);
    }

    const json = await await response.json();

    return json;
  }

  private async generateSong(payload: AudioPayload): Promise<AudioInfo[]> {
    const startTime = Date.now();
    
    const result = await this.post('/audios', payload);

    const audios: AudioInfo[] = result.data.map((audio: any) => {
      return {
        id: audio.id,
        title: audio.title,
        image_url: audio.image_url,
        lyric: this.parseLyrics(audio.lyric),
        audio_url: audio.audio_url,
        video_url: audio.video_url, 
        created_at: audio.created_at, 
        model_name: audio.model,
        prompt: audio.prompt,
        status: audio.state,
        tags: audio.style,
        duration: audio.duration,
        task_id: result.task_id
      };
    });

    const costTime = Date.now() - startTime;
    logger.info('Generate Response:\n' + JSON.stringify(audios, null, 2));
    logger.info('Cost time: ' + costTime);

    return audios;
  }
}

console.log('token: ' + process.env.ACEDATA_TOKEN)

export const aceDataSunoApi = new AceDataSunoApi(
  process.env.ACEDATA_TOKEN || '',
  process.env.ACEDATA_BASE_URL || '',
  process.env.API_URL || '',
);
