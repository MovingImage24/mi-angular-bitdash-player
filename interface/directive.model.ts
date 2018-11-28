import { WebcastState } from '../src/webcast.state';
import { BitmovinPlayerConfig } from './bitmovin.model';
import { PlayerSource, WebcastModel } from './webcast.model';

export interface MiAngularBitmovinPlayerDirectiveScope extends angular.IScope {
  config: BitmovinPlayerConfig;
  options: WebcastOptions;
  webcast: WebcastModel;

  vm: ControllerModel;
}

export interface ControllerModel {
  playerSource: PlayerSource;
}

export interface WebcastOptions {
  forcedState?: WebcastState;
}

// export interface KsdnSettings {
//   token: string;
//   urn: string;
//   fallBackUrl: string;
//   host?: string;
// }
//
//
//
// export interface StateData {
//   data?: {
//     playout: any;
//     preferredTech: PreferredTech | null;
//     hiveSettings: HiveSettings;
//     ksdnSettings: KsdnSettings;
//   };
// }
//
// export interface IMyElement extends Element {
//   style: any;
// }
//
// export interface IWindow extends angular.IWindowService {
//   window: IWindowInterface;
// }
//
// export interface IBitmovin {
//   playerui: any;
//
//   initHiveSDN(bitmovinPlayer: BitmovinPlayerApi, debug?: any): any;
//
//   player(id: string): BitmovinPlayerApi;
// }
//
// export interface IWindowInterface extends Window {
//   bitmovin: IBitmovin;
//   ksdn: any;
// }
//
// export interface BitmovinPlayerApi {
//   load(source: any): any;
//
//   isReady(): boolean;
//
//   setup(config: any): any;
//
//   play(): void;
//
//   pause(): void;
//
//   destroy(): BitmovinPlayerApi;
//
//   initSession(hsl: string): any;
//
//   addEventHandler(eventName: string, callback: (event?: any) => void): void;
// }
//
// export interface HiveSettings {
//   serviceUrl: string;
//   origHlsUrl: string;
// }
//
// export interface IBitmovinUIManager {
//   buildAudioOnlyUI(player: BitmovinPlayerApi, playerConfig: IMIUIConfig): void;
//
//   buildAudioVideoUI(player: BitmovinPlayerApi): void;
// }
//
//
// export interface IUIAudioOnlyOverlayConfig {
//   backgroundImageUrl?: string;
//   hiddeIndicator?: boolean;
// }
//
// export interface IMIUIConfig {
//   audioOnlyOverlayConfig?: IUIAudioOnlyOverlayConfig;
// }
//
// export interface IReason {
//   code: number;
//   message: string;
// }

