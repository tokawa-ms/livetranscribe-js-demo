// グローバル変数
let recognizer = null;
let isRecognizing = false;
const speakerColors = {};
let colorIndex = 0;
const colors = [
    '#0078d4', '#666666', '#7719aa', '#107c41', '#d83b01', '#00897b',
    '#00b7c3', '#498205', '#881798', '#0063b1', '#6b8e23'
];

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
    // ボタン要素を取得
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    
    // ボタンにイベントリスナーを追加
    startButton.addEventListener('click', startTranscription);
    stopButton.addEventListener('click', stopTranscription);
    
    // ローカルストレージから設定を取得
    const savedRegion = localStorage.getItem('speechRegion');
    const savedKey = localStorage.getItem('speechKey');
    if (savedRegion) {
        document.getElementById('region').value = savedRegion;
    }
    if (savedKey) {
        document.getElementById('key').value = savedKey;
    }
});

// 認識開始処理
async function startTranscription() {
    try {
        if (isRecognizing) {
            console.log('すでに認識中です');
            return;
        }
        
        // UI要素から設定を取得
        const region = document.getElementById('region').value.trim();
        const key = document.getElementById('key').value.trim();
        const language = document.getElementById('language').value;
        
        // 入力チェック
        if (!region || !key) {
            updateStatus('エラー: リージョンとキーを入力してください', true);
            return;
        }
        
        // 設定をローカルストレージに保存
        localStorage.setItem('speechRegion', region);
        localStorage.setItem('speechKey', key);
        
        updateStatus('マイクへのアクセスを要求中...');
        
        // 設定をUIに反映
        document.getElementById('startButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        
        // Speech SDKが読み込まれているか確認
        if (!window.SpeechSDK) {
            updateStatus('エラー: Speech SDKが読み込まれていません', true);
            return;
        }
        
        // Speech Service設定
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key, region);
        speechConfig.speechRecognitionLanguage = language;
        
        // マイクのセットアップ
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        
        // 会話トランスクライバーの作成
        recognizer = new SpeechSDK.ConversationTranscriber(speechConfig, audioConfig);
        
        // イベントハンドラーの設定
        recognizer.transcribed = handleTranscriptionResult;
        recognizer.canceled = handleCancellation;
        recognizer.sessionStopped = handleSessionStopped;
        
        // 認識開始
        await recognizer.startTranscribingAsync(
            () => {
                isRecognizing = true;
                updateStatus('認識中... マイクに向かって話してください');
                console.log('Transcription started');
            },
            (err) => {
                updateStatus(`エラー: ${err}`, true);
                console.error('Error starting transcription:', err);
                resetUI();
            }
        );
    } catch (err) {
        updateStatus(`エラー: ${err.message || err}`, true);
        console.error('Error:', err);
        resetUI();
    }
}

// 認識結果のハンドラー
function handleTranscriptionResult(s, e) {
    if (!e.result || !e.result.text || e.result.text.trim() === '') return;
    
    const speakerId = e.result.speakerId || '不明な話者';
    const text = e.result.text.trim();
    const timestamp = new Date().toLocaleTimeString();
    
    // 話者固有の色を割り当て
    if (!speakerColors[speakerId]) {
        speakerColors[speakerId] = colors[colorIndex % colors.length];
        colorIndex++;
    }
    
    // 結果をUIに表示
    displayTranscriptionResult(speakerId, text, timestamp, speakerColors[speakerId]);
    
    console.log(`Speaker ${speakerId}: ${text}`);
}

// キャンセルハンドラー
function handleCancellation(s, e) {
    let reason = e.errorDetails || 'キャンセルされました';
    if (e.reason === SpeechSDK.CancellationReason.Error) {
        updateStatus(`エラー: ${reason}`, true);
    } else {
        updateStatus('認識キャンセル: ' + reason);
    }
    
    resetUI();
}

// セッション終了ハンドラー
function handleSessionStopped(s, e) {
    updateStatus('認識セッションが終了しました');
    resetUI();
}

// 認識停止
async function stopTranscription() {
    if (!recognizer || !isRecognizing) {
        updateStatus('認識は実行されていません');
        return;
    }
    
    try {
        updateStatus('認識を停止中...');
        
        await recognizer.stopTranscribingAsync(
            () => {
                updateStatus('認識を停止しました');
                resetUI();
            },
            (err) => {
                updateStatus(`停止中にエラーが発生しました: ${err}`, true);
                console.error('Error stopping transcription:', err);
                resetUI();
            }
        );
    } catch (err) {
        updateStatus(`エラー: ${err.message || err}`, true);
        console.error('Error:', err);
        resetUI();
    }
}

// UI状態のリセット
function resetUI() {
    isRecognizing = false;
    document.getElementById('startButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
    
    if (recognizer) {
        recognizer.close();
        recognizer = null;
    }
}

// ステータス更新
function updateStatus(message, isError = false) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = `ステータス: ${message}`;
    
    if (isError) {
        statusElement.style.color = '#e81123';
        console.error(message);
    } else {
        statusElement.style.color = '#000';
        console.log(message);
    }
}

// トランスクリプション結果の表示
function displayTranscriptionResult(speakerId, text, timestamp, color) {
    const resultsContainer = document.getElementById('transcriptionResult');
    const lastSpeakerElement = resultsContainer.lastElementChild;
    
    // 新しいメッセージ要素を作成
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message speaker-bubble';
    messageElement.style.borderLeftColor = color;
    
    // 話者IDの表示
    const speakerElement = document.createElement('div');
    speakerElement.className = 'speaker-id';
    speakerElement.textContent = `話者 ${speakerId}`;
    speakerElement.style.color = color;
    messageElement.appendChild(speakerElement);
    
    // テキストの表示
    const textElement = document.createElement('div');
    textElement.className = 'message-text';
    textElement.textContent = text;
    messageElement.appendChild(textElement);
    
    // タイムスタンプの表示
    const timeElement = document.createElement('div');
    timeElement.className = 'message-time';
    timeElement.textContent = timestamp;
    messageElement.appendChild(timeElement);
    
    // 前の話者と異なる場合、余白を追加
    if (lastSpeakerElement && 
        lastSpeakerElement.querySelector('.speaker-id').textContent !== `話者 ${speakerId}`) {
        messageElement.classList.add('new-speaker');
    }
    
    // 結果を表示
    resultsContainer.appendChild(messageElement);
    
    // 自動スクロール
    resultsContainer.scrollTop = resultsContainer.scrollHeight;
}