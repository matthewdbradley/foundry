// Music Streamer v13 compatible
// Original author: Fryke#0746
// Updated by: matthewdbradley

class MusicStreamer extends Application {
  static ID = 'music-streamer';

  constructor(options = {}) {
    super(options);

    this.streamURL = null;
    this.audio = new Audio();
    this.audio.autoplay = true;
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "music-streamer-window",
      template: "modules/music-streamer/templates/music-streamer.html",
      popOut: false,
    });
  }

  async activateListeners(html) {
    super.activateListeners(html);

    // Handle socket messages
    if (!this._socketRegistered) {
      game.socket.on(`module.music-streamer`, async (message) => {
        this.streamURL = message;
        await game.users.current.setFlag("music-streamer", "streamURL", this.streamURL);
        document.getElementById('musicstreamer-url-input').value = this.streamURL;
        document.getElementById('musicstreamer-settings').classList.remove('open');
        this.play();
      });
      this._socketRegistered = true;
    }

    // Set volume slider
    const volumeSlider = html[0].querySelector("#musicstreamer-volume-control");
    volumeSlider.addEventListener("change", (e) => {
      this.audio.volume = e.currentTarget.value / 100;
    });

    // Load current stream URL into input
    document.getElementById('musicstreamer-url-input').value = this.streamURL ?? '';

    // Handle drag behavior
    html.find('#musicstreamer-move-handle').mousedown((ev) => {
      this._handleDrag(ev);
    });
  }

  async getData() {
    let pos = await this.getPos();
    return { pos };
  }

  async getPos() {
    if (!this.pos) {
      this.pos = await game.users.current.getFlag("music-streamer", "position");

      if (!this.pos) {
        const hbpos = $('#hotbar').position();
        const width = $('#hotbar').width();
        this.pos = { left: hbpos.left + width + 4, right: '', top: 10, bottom: '' };
        await game.users.current.setFlag("music-streamer", "position", this.pos);
      }
    }

    return Object.entries(this.pos)
      .filter(([_, val]) => val != null)
      .map(([key, val]) => `${key}:${val}px`)
      .join('; ');
  }

  async setPos() {
    if (!this.pos) {
      const hbpos = $('#hotbar').position();
      const width = $('#hotbar').width();
      this.pos = { left: hbpos.left + width + 4, right: '', top: 10, bottom: '' };
      await game.users.current.setFlag("music-streamer", "position", this.pos);
    }

    $(this.element).css(this.pos);
    return this;
  }

  toggleSettings() {
    document.getElementById('musicstreamer-settings').classList.toggle('open');
  }

  async setSrc() {
    const newURL = document.getElementById('musicstreamer-url-input').value;

    if (game.user.isGM) {
      game.socket.emit('module.music-streamer', newURL);
    }

    this.streamURL = newURL;
    await game.users.current.setFlag("music-streamer", "streamURL", this.streamURL);
    document.getElementById('musicstreamer-settings').classList.remove('open');
    this.play();
  }

  stop() {
    this.audio.pause();
    this.audio.src = "about:blank";
    this.audio.load();
  }

  play() {
    if (this.streamURL) {
      this.audio.src = this.streamURL;
    }
    this.audio.load();
    this.audio.play().catch(console.warn);
  }

  async initialize() {
    this.streamURL = await game.users.current.getFlag("music-streamer", "streamURL") || '';
    this.audio.src = this.streamURL;
    await this.render(true);
  }

  _handleDrag(ev) {
    ev.preventDefault();
    if (ev.which === 3) return; // right-click

    const element = document.getElementById("music-streamer");
    let startX = ev.clientX;
    let startY = ev.clientY;

    const dragMouseDown = (e) => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    };

    const elementDrag = (e) => {
      e.preventDefault();
      let deltaX = startX - e.clientX;
      let deltaY = startY - e.clientY;
      startX = e.clientX;
      startY = e.clientY;

      element.style.top = (element.offsetTop - deltaY) + "px";
      element.style.left = (element.offsetLeft - deltaX) + "px";
      element.style.position = 'fixed';
      element.style.zIndex = 100;
    };

    const closeDragElement = async () => {
      document.onmouseup = null;
      document.onmousemove = null;
      element.style.zIndex = null;

      let xPos = Math.clamped(element.offsetLeft, 0, window.innerWidth - 200);
      let yPos = Math.clamped(element.offsetTop, 0, window.innerHeight - 20);

      this.pos = { top: yPos, left: xPos };
      await game.users.current.setFlag('music-streamer', 'position', this.pos);
    };

    dragMouseDown(ev);
  }
}

Hooks.once("ready", async () => {
  const musicStreamer = new MusicStreamer();
  window.MusicStreamer = musicStreamer;
  await musicStreamer.initialize();
});
