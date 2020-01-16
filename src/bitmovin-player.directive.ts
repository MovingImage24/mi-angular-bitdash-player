import * as ng from 'angular';

import { BitmovinPlayerController } from './bitmovin-player.controller';
import { BitmovinPlayerApi, BitmovinUIManager, DirectiveScope, IWindow, PlayerApiReadyEvent, PlayerPlugin } from './models';
import { PlayerApi } from './player-api';
import { PlayerPlaybackType } from './player-playback.type';
import { AnalyticsPlugin, SubtitlesPlugin } from './plugins';

export const deps = {
  SubtitlesPlugin,
  PlayerApi,
};

BitmovinPlayerDirective.$inject = ['$window', '$log', 'ksdn', 'YouboraLib', 'YouboraAdapter', 'HiveBitmovin'];

export function BitmovinPlayerDirective($window: IWindow, $log: ng.ILogService,
                                        ksdn: any, youboraLib: any, youboraAdapter: any,
                                        HiveBitmovin: any): ng.IDirective {
  return {
    controller: 'MiBitdashController',
    controllerAs: 'bitdashVm',
    replace: true,
    restrict: 'EA',
    scope: {
      config: '=',
      options: '=?',
      playerApiReady: '&?',
      webcast: '=',
    },
    template: `<div id="mi-bitdash-player" width="100%" height="auto"></div>`,

    link(scope: DirectiveScope, element: ng.IAugmentedJQuery, attrs: ng.IAttributes, controller: BitmovinPlayerController): void {
      const playerId = 'mi-bitdash-player';
      const webcast = scope.webcast;
      const playerConfig = scope.config;
      const recoverState = (scope.options && scope.options.recoverState) ? scope.options.recoverState : null;
      const youboraConfig = (scope.options && scope.options.youbora) ? scope.options.youbora : null;
      let playerApi: PlayerApi;

      init();

      function init(): void {
        if (!controller.vm.playerConfig) {
          return;
        }

        switch (controller.vm.playerConfig.type) {
          case PlayerPlaybackType.KSDN:
            createKollectivePlayer();
            break;
          case PlayerPlaybackType.HIVE:
          case PlayerPlaybackType.HIVE_WEB_RTC:
            createHivePlayer();
            break;
          default:
            createDefaultPlayer();
        }
      }

      function createDefaultPlayer(): void {
        const source = { hls: controller.vm.playerConfig.hlsUrl };
        playerConfig.source = {}; // we don't want to load sources on setup

        createPlayer()
          .then(() => {
            return playerApi.load(source)
              .then(() => playerReady())
              .catch(() => playerLoadSourceErrorHandler());
          })
          .catch((err) => playerErrorHandler(err));
      }

      function createKollectivePlayer(): void {
        playerConfig.source = {}; // we want to set the source by the plugin
        const auth = controller.vm.playerConfig.p2p.token;
        const urn = controller.vm.playerConfig.p2p.urn;
        const host = controller.vm.playerConfig.p2p.host;
        const fallbackSrc = controller.vm.playerConfig.hlsUrl;

        createPlayer()
          .then((bitmovinPlayerInstance) => {
            const ksdnPlugin = new ksdn.Players.Bitmovin({ auth, host, fallbackSrc });
            const livecycleHooks = getKollectiveLivecyleHooks();

            ksdnPlugin.play(bitmovinPlayerInstance, urn, livecycleHooks);
          })
          .catch((err) => playerErrorHandler(err));
      }

      function getKollectiveLivecyleHooks(): any {
        const errorPrefix = 'Kollective plugin error: ';

        return {
          onAgentNotDetected: (plugin: any, reasons: any) => {
            $log.error(`${errorPrefix} Machine does not have a Kollective Agent installed. Reason:`, reasons);
          },
          onAgentRejected: (plugin: any, criteria: any) => {
            if (!criteria.provisionedForCurrentUrn) {
              $log.error(`${errorPrefix} Agent detected but not provisioned for URN`);
            }
            if (!criteria.notBlackedOut) {
              $log.error(`${errorPrefix} Agent detected but is currently blacked out`);
            }
          },
          onPlaybackRequestFailure: (plugin: any, request: any) => {
            $log.error(`${errorPrefix}  Failure to retrieve playback info for the provided URN:`, request);
            return true;
          },
          onPrimingFailure: (plugin: any) => {
            $log.error(`${errorPrefix}  Agent fails to start priming the stream through the Kollective ECDN`);
          },
          onSessionFailure: () => {
            $log.error(`${errorPrefix} Failure to start a session with the agent`);
          },
          setSource: (player: BitmovinPlayerApi, src: string) => {
            player.load({ hls: src })
              .then(() => playerReady())
              .catch((err) => playerErrorHandler(err));
          },
        };
      }

      function createHivePlayer(): void {
        const hiveTicket = controller.vm.playerConfig.p2p.url;
        const hiveTechOrder = controller.vm.playerConfig.p2p.techOrder || ['HiveJava', 'HiveJS'];
        hiveTechOrder.push('StatsJS');

        const pluginConfig = {
          debugLevel: 'off', // 'debug', 'off'
          hiveTechOrder,
        };
        const playerRef = $window.window.bitmovin.player(playerId);

        HiveBitmovin.initHiveSDN();
        const plugin = new HiveBitmovin(playerRef, pluginConfig);

        createPlayer()
          .then((playerInstance) => initHiveSession(plugin, hiveTicket, playerInstance))
          .catch((err: any) => {
            playerErrorHandler(err);
          });
      }

      function initHiveSession(hivePlugin: any, hiveTicket: string, playerInstance: BitmovinPlayerApi): BitmovinPlayerApi {
        const successHandler = (hiveSession) => {
          return playerInstance.load({ hls: hiveSession.manifest })
            .then(() => playerReady())
            .catch((reason) => playerErrorHandler(reason));
        };

        const errorHandler = (error) => {
          // Partner-specific implementation on how to handle Hive ticket resolution failure
          $log.warn(`Hive plugin failed, fallback to default player. Error: ${JSON.stringify(error)}`);

          playerInstance.destroy();

          setTimeout(() => {
            createDefaultPlayer();
          }, 60);
        };

        return hivePlugin.initSession(hiveTicket)
          .then(successHandler)
          .catch(errorHandler);
      }

      function playerErrorHandler(error: any): void {
        $log.error('player error:', error);
      }

      function setupPlayerUi(bitmovinPlayerInstance: BitmovinPlayerApi): void {
        const isAudioOnly = webcast.layout.layout === 'audio-only' || webcast.layout.layout === 'audio-only-compact';
        const bitmovinUIManager: BitmovinUIManager = $window.window.miBitmovinUi.playerui.UIManager.Factory;

        if (isAudioOnly) {
          bitmovinUIManager.buildAudioOnlyUI(bitmovinPlayerInstance, controller.getAudioOnlyPlayerConfig());
        } else {
          bitmovinUIManager.buildAudioVideoUI(bitmovinPlayerInstance);
        }

        const bitmovinControlbar = getElementsByClassName('bitmovinplayer-container');
        if (bitmovinControlbar) {
          bitmovinControlbar.style.minWidth = '175px';
          bitmovinControlbar.style.minHeight = '101px';
          $window.document.getElementById('bitmovinplayer-video-mi-bitdash-player').setAttribute('title', webcast.name);
        }
      }

      function getElementsByClassName(className: string): HTMLElement {
        return $window.document.getElementsByClassName(className)[0] as HTMLElement;
      }

      function createPlayer(): Promise<BitmovinPlayerApi> {
        const playerSDK = $window.window.bitmovin.player(playerId);
        const playerPlugins = createPlugins();
        const youboraPlugin = youboraConfig ? createYouboraPlugin() : null;

        // TODO: set it in the app and not here
        playerConfig.style = { ux: false };
        return playerSDK.setup(playerConfig).then((bitmovinPlayerApi) => {
          setupPlayerUi(bitmovinPlayerApi);

          playerApi = new deps.PlayerApi(bitmovinPlayerApi);
          playerApi.setupPlugins(playerPlugins, recoverState);

          if (youboraPlugin) {
            const youboraBitmovinAdapter = new youboraAdapter(bitmovinPlayerApi);
            youboraPlugin.setAdapter(youboraBitmovinAdapter);
          }

          return bitmovinPlayerApi;
        });
      }

      function createYouboraPlugin(): any {
        return new youboraLib.Plugin(youboraConfig);
      }

      function createPlugins(): PlayerPlugin[] {
        const plugins = [];

        if (controller.vm.playerConfig.videoId) {
          const miAnalytics = new AnalyticsPlugin(controller.vm.playerConfig.videoId, $log);
          plugins.push(miAnalytics);
        }

        if (controller.vm.playerConfig.videoTracks) {
          const subtitlePlugin = new deps.SubtitlesPlugin(controller.vm.playerConfig.videoTracks);
          plugins.push(subtitlePlugin);
        }

        return plugins;
      }

      function playerReady(): void {
        if (recoverState) {
          playerApi.setVolume(recoverState.volume);

          if (recoverState.seekTo) {
            playerApi.seek(recoverState.seekTo);
          }

          if (recoverState.isMuted) {
            playerApi.mute();
          }
        }

        dispatchReadyEvent();
      }

      function playerLoadSourceErrorHandler(): void {
        dispatchReadyEvent();
      }

      function dispatchReadyEvent(): void {
        const $event: PlayerApiReadyEvent = {
          playerApi: playerApi.getPublicApi(),
        };

        (scope.playerApiReady || ng.noop)({ $event });
      }


      function cleanup(): void {
        if (playerApi) {
          playerApi.destroy();
          playerApi = null;
        }
      }

      scope.$on('$destroy', () => {
        cleanup();
      });
    },
  };
}
