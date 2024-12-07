import axios, { AxiosInstance } from 'axios';
import UserAgent from 'user-agents';
import pino from 'pino';
import { wrapper } from 'axios-cookiejar-support';
import { AudioInfo } from './models';
import { Console } from 'console';

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

class AceDataSunoApi {
  private static BASE_URL: string = 'https://api.acedata.cloud/suno';
  private currentToken?: string;

  constructor(currentToken: string) {
    this.currentToken = currentToken;
  }

private async post(path: string, payload: AudioPayload | { prompt: string}): Promise<any> {
  const requestUrl = `${AceDataSunoApi.BASE_URL}${path}`;
  
  console.log('Payload: ' + JSON.stringify(payload));
  console.log('Request Url: ' + requestUrl);

  const options = {
    method: "post",
    headers: {
      "accept": "application/json",
      "authorization": `Bearer ${this.currentToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  };
  
  const response = await fetch(requestUrl, options);
  console.log('response: ', JSON.stringify(response));
  
  if (response.status !== 200) {
    throw new Error('Error response:' + response.statusText);
  }

  const json = await await response.json();
  console.log('json: ', JSON.stringify(json));

  return json;
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
    const startTime = Date.now();

    const payload: AudioPayload = {
      action: Actions.generate,
      custom: false,
      prompt: prompt,
      instrumental: make_instrumental,
      model: model as Models
    }

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
    const startTime = Date.now();

    const payload: AudioPayload = {
      action: Actions.generate,
      custom: true,
      style: tags,
      title: title,
      lyric: prompt,
      instrumental: make_instrumental,
      model: model as Models
    }
    
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

  /**
   * Generates lyrics based on a given prompt.
   * @param prompt The prompt for generating lyrics.
   * @returns The generated lyrics text.
   */
  public async generateLyrics(prompt: string): Promise<string> {
    // Initiate lyrics generation

    const result = await this.post('/lyrics', { prompt });
    
    // Return the generated lyrics text
    return result.data.text;
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
    const startTime = Date.now();

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
    
    const result = await this.post('/lyrics', payload);

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

    return audios[0];
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
}

console.log('token: ' + process.env.ACEDATA_TOKEN)

export const aceDataSunoApi = new AceDataSunoApi(process.env.ACEDATA_TOKEN || '');
