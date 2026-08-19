export type Language = 'en' | 'zh';

export interface Copy {
  brandCaption: string;
  browserOnly: string;
  loadTrack: string;
  changeTrack: string;
  chooseAnotherAudio: string;
  pulseVisualizer: string;
  pulseMap: string;
  waitingForTrack: string;
  momentsFound: string;
  readyForTrack: string;
  emptyTitle: string;
  emptyBody: string;
  decoding: string;
  analyzing: string;
  readingAudio: string;
  decodingTrack: string;
  findingPulse: string;
  pulseMapReady: string;
  analysisError: string;
  stageCopy: string;
  chooseAnother: string;
  xTime: string;
  playing: string;
  paused: string;
  readout: string;
  detectedPulseMoments: string;
  trackLength: string;
  analysis: string;
  local: string;
  waiting: string;
  tuning: string;
  shapePulse: string;
  detectionSensitivity: string;
  fewerMoments: string;
  moreMoments: string;
  minimumGap: string;
  tight: string;
  spacious: string;
  travelSpeed: string;
  calm: string;
  restless: string;
  trailLength: string;
  close: string;
  long: string;
  turnStyle: string;
  random: string;
  zigzag: string;
  showBeatMarkers: string;
  pulseNote: string;
  footer: string;
  chooseTrackEyebrow: string;
  chooseTrackTitle: string;
  chooseTrackBody: string;
  localOnly: string;
  localAudioAnalysis: string;
  uploadTitle: string;
  uploadCopy: string;
  chooseAudio: string;
  uploadHint: string;
  includedExamples: string;
  switchToChinese: string;
  switchToEnglish: string;
  restartTrack: string;
  untitledTrack: string;
  pauseTrack: string;
  playTrack: string;
  pulseTimeline: string;
  seekTrack: string;
  jumpToBeat: string;
  unsupportedAudio: string;
  includedSampleUnavailable: string;
  includedSampleLoadFailed: string;
  playbackBlocked: string;
  cannotMakeMap: string;
  cannotAnalyzeTrack: string;
  tryAnotherTrack: string;
  analysisCancelled: string;
  cannotReadAudio: string;
}

const COPY: Record<Language, Copy> = {
  en: {
    brandCaption: 'A local map of the moments that move',
    browserOnly: 'Browser only',
    loadTrack: 'Load a track',
    changeTrack: 'Change track',
    chooseAnotherAudio: 'Choose another audio file',
    pulseVisualizer: 'Pulse visualizer',
    pulseMap: 'Pulse map',
    waitingForTrack: 'Waiting for a track',
    momentsFound: 'moments found',
    readyForTrack: 'Ready for a track',
    emptyTitle: 'Choose a sound to see its shape.',
    emptyBody: 'The path will follow the energy of your track. Choose one below or load your own audio.',
    decoding: 'Decoding',
    analyzing: 'Analyzing',
    readingAudio: 'Reading audio data',
    decodingTrack: 'Decoding the track',
    findingPulse: 'Adapting to each musical passage',
    pulseMapReady: 'Pulse map ready',
    analysisError: 'Could not analyze this track',
    stageCopy: 'The audio stays on this device while the pulse map is prepared.',
    chooseAnother: 'Choose another',
    xTime: 'x / time',
    playing: 'playing',
    paused: 'paused',
    readout: 'Readout',
    detectedPulseMoments: 'detected pulse moments',
    trackLength: 'Track length',
    analysis: 'Analysis',
    local: 'Local',
    waiting: 'Waiting',
    tuning: 'Tuning',
    shapePulse: 'Shape the pulse',
    detectionSensitivity: 'Adaptive detail',
    fewerMoments: 'Fewer moments',
    moreMoments: 'More moments',
    minimumGap: 'Minimum gap',
    tight: 'Tight',
    spacious: 'Spacious',
    travelSpeed: 'Travel speed',
    calm: 'Calm',
    restless: 'Restless',
    trailLength: 'Trail length',
    close: 'Close',
    long: 'Long',
    turnStyle: 'Turn style',
    random: 'Random',
    zigzag: 'Zigzag',
    showBeatMarkers: 'Show beat markers on path',
    pulseNote: 'A moving local window adapts to quiet and loud passages. Spectral attacks shape the path, while repeating pulse patterns reinforce musical timing.',
    footer: 'No upload. No account. Just the shape of the sound.',
    chooseTrackEyebrow: '02 / Choose a track',
    chooseTrackTitle: 'Start with a sound',
    chooseTrackBody: 'Pick an included example or load your own file. Every option stays visible outside the visual stage.',
    localOnly: 'Local only',
    localAudioAnalysis: 'Local audio analysis',
    uploadTitle: 'Choose a track to map.',
    uploadCopy: 'Drop a song here and Pulse will map its energy peaks into a playable visual path. Nothing leaves your browser.',
    chooseAudio: 'Choose audio',
    uploadHint: 'MP3, WAV, M4A or OGG',
    includedExamples: 'Included examples',
    switchToChinese: '切换中文',
    switchToEnglish: 'Switch to English',
    restartTrack: 'Restart track',
    untitledTrack: 'Untitled track',
    pauseTrack: 'Pause track',
    playTrack: 'Play track',
    pulseTimeline: 'Pulse timeline',
    seekTrack: 'Seek through the track',
    jumpToBeat: 'Jump to beat at',
    unsupportedAudio: 'That file does not look like an audio track. Choose MP3, WAV, M4A, AAC, OGG or FLAC.',
    includedSampleUnavailable: 'The included sample is not available.',
    includedSampleLoadFailed: 'The included sample could not be loaded.',
    playbackBlocked: 'Playback was blocked by the browser. Press play again to start the track.',
    cannotMakeMap: 'Could not make a map',
    cannotAnalyzeTrack: 'This track could not be analyzed.',
    tryAnotherTrack: 'Choose another audio file to try again.',
    analysisCancelled: 'Analysis cancelled.',
    cannotReadAudio: 'We could not read this audio file. Try another track.',
  },
  zh: {
    brandCaption: '记录声音变化的本地地图',
    browserOnly: '仅在浏览器运行',
    loadTrack: '载入曲目',
    changeTrack: '更换曲目',
    chooseAnotherAudio: '选择其他音频文件',
    pulseVisualizer: 'Pulse 可视化',
    pulseMap: '脉冲轨迹',
    waitingForTrack: '等待曲目',
    momentsFound: '个变化节点',
    readyForTrack: '准备好载入曲目',
    emptyTitle: '选一首曲子，看见它的形状。',
    emptyBody: '轨迹会跟随音乐的能量变化。你可以从下面选择示例，也可以载入自己的音频。',
    decoding: '解码中',
    analyzing: '分析中',
    readingAudio: '读取音频数据',
    decodingTrack: '正在解码曲目',
    findingPulse: '正在适应每一段音乐',
    pulseMapReady: '脉冲轨迹已准备好',
    analysisError: '无法分析这首曲目',
    stageCopy: '音频只会留在当前设备，脉冲轨迹也在浏览器本地生成。',
    chooseAnother: '选择其他曲目',
    xTime: '横轴 / 时间',
    playing: '播放中',
    paused: '已暂停',
    readout: '读数',
    detectedPulseMoments: '检测到的变化节点',
    trackLength: '曲目时长',
    analysis: '分析方式',
    local: '本地',
    waiting: '等待中',
    tuning: '调节',
    shapePulse: '调整脉冲形状',
    detectionSensitivity: '动态细节',
    fewerMoments: '节点更少',
    moreMoments: '节点更多',
    minimumGap: '最小间隔',
    tight: '紧密',
    spacious: '宽松',
    travelSpeed: '路径速度',
    calm: '平静',
    restless: '活跃',
    trailLength: '轨迹长度',
    close: '短',
    long: '长',
    turnStyle: '转弯方式',
    random: '随机',
    zigzag: '交替',
    showBeatMarkers: '显示轨迹上的节点',
    pulseNote: '动态窗口会分别适应安静段和响亮段；音色起音决定转折，重复的局部节拍会加强打点。',
    footer: '不上传，不注册，只看见声音的形状。',
    chooseTrackEyebrow: '02 / 选择曲目',
    chooseTrackTitle: '从一首曲子开始',
    chooseTrackBody: '选择内置示例，或载入自己的音频。选曲区独立于视觉画面，所有选项都会完整显示。',
    localOnly: '仅本地运行',
    localAudioAnalysis: '本地音频分析',
    uploadTitle: '选择一首曲目来生成轨迹。',
    uploadCopy: '把歌曲拖到这里，Pulse 会把能量峰值转成可播放的视觉路径。音频不会离开浏览器。',
    chooseAudio: '选择音频',
    uploadHint: 'MP3、WAV、M4A 或 OGG',
    includedExamples: '内置示例',
    switchToChinese: '中文',
    switchToEnglish: 'EN',
    restartTrack: '重新开始',
    untitledTrack: '未命名曲目',
    pauseTrack: '暂停播放',
    playTrack: '播放曲目',
    pulseTimeline: '脉冲时间轴',
    seekTrack: '拖动浏览曲目',
    jumpToBeat: '跳转到节点',
    unsupportedAudio: '这个文件看起来不是音频。请选择 MP3、WAV、M4A、AAC、OGG 或 FLAC。',
    includedSampleUnavailable: '内置示例暂时不可用。',
    includedSampleLoadFailed: '内置示例载入失败。',
    playbackBlocked: '浏览器阻止了播放，请再次点击播放按钮。',
    cannotMakeMap: '无法生成轨迹',
    cannotAnalyzeTrack: '这首曲目无法完成分析。',
    tryAnotherTrack: '请选择其他音频再试一次。',
    analysisCancelled: '分析已取消。',
    cannotReadAudio: '无法读取这个音频文件，请换一首曲目。',
  },
};

export function getCopy(language: Language): Copy {
  return COPY[language];
}

export function formatMoments(language: Language, count: number): string {
  return language === 'zh' ? `${count} ${getCopy(language).momentsFound}` : `${count} ${getCopy(language).momentsFound}`;
}
