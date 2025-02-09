let nextPageToken = '';
        let isFirstChatLoad = true;

        function showError(message) {
            const errorElement = document.getElementById('error-message');
            errorElement.textContent = message;
            setTimeout(() => errorElement.textContent = '', 5000);
        }

        function extractYouTubeIDs(input) {
    console.log('Extracting IDs from input:', input);
    let channelId = null;
    let videoId = null;
    let username = null;

    try {
        // Handle direct channel/video IDs
        if (input.match(/^[a-zA-Z0-9_-]{24}$/)) {
            console.log('Input matches channel ID pattern');
            channelId = input;
        } else if (input.match(/^[a-zA-Z0-9_-]{11}$/)) {
            console.log('Input matches video ID pattern');
            videoId = input;
        } else {
            let url = new URL(input);
            console.log('Parsed URL:', url.toString());
            console.log('Pathname:', url.pathname);
            
            if (url.hostname.includes('youtube.com')) {
                console.log('YouTube domain detected');
                if (url.pathname.includes('/channel/')) {
                    channelId = url.pathname.split('/channel/')[1].split('/')[0];
                    console.log('Channel ID found in URL:', channelId);
                } else if (url.pathname.includes('/c/')) {
                    username = url.pathname.split('/c/')[1].split('/')[0];
                    console.log('Custom URL username found:', username);
                } else if (url.pathname.includes('/@')) {
                    username = url.pathname.split('/@')[1].split('/')[0];
                    console.log('Handle username found:', username);
                } else if (url.pathname.includes('/user/')) {
                    username = url.pathname.split('/user/')[1].split('/')[0];
                    console.log('Legacy username found:', username);
                } else if (url.pathname.includes('/watch')) {
                    videoId = url.searchParams.get('v');
                    console.log('Video ID found in watch URL:', videoId);
                } else if (url.pathname.includes('/live/')) {
                    videoId = url.pathname.split('/live/')[1].split('/')[0];
                    console.log('Video ID found in live URL:', videoId);
                }
            } else if (url.hostname === 'youtu.be') {
                videoId = url.pathname.substring(1);
                console.log('Video ID found in youtu.be URL:', videoId);
            }
        }
    } catch (error) {
        console.error('Error parsing URL:', error);
        showError('Invalid YouTube link. Please enter a valid URL or ID.');
        return {};
    }

    console.log('Final extracted IDs:', { channelId, videoId, username });
    return { channelId, videoId, username };
}
async function getChannelIdFromVideo(videoId, apiKey) {
    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.items?.[0]?.snippet?.channelId || null;
    } catch (error) {
        showError(`Error fetching channel ID from video: ${error.message}`);
        return null;
    }
}


async function getChannelIdFromUsername(username, apiKey) {
    try {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${username}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.items?.[0]?.id || null;
    } catch (error) {
        showError(`Error fetching channel ID: ${error.message}`);
        return null;
    }
}


        async function fetchSubscriberCount(channelId, apiKey) {
    try {
        console.log('Fetching subscriber count for channel:', channelId);
        const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
        console.log('Request URL:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        console.log('API Response:', data);

        if (data.error) {
            throw new Error(`API Error: ${data.error.message}`);
        }

        if (!data.items || data.items.length === 0) {
            throw new Error('Channel not found - check if the channel ID is correct');
        }

        const count = parseInt(data.items[0].statistics.subscriberCount).toLocaleString();
        console.log('Parsed subscriber count:', count);
        document.getElementById('subscriber-count').innerText = `Subscribers: ${count}`;
    } catch (error) {
        console.error('Detailed error:', error);
        showError(`Error fetching subscriber count: ${error.message}`);
        document.getElementById('subscriber-count').innerText = 'Error fetching subscriber count';
    }
}

        async function fetchLikeCount(videoId, apiKey) {
            try {
                const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error.message);
                }

                if (!data.items || data.items.length === 0) {
                    throw new Error('Video not found');
                }

                const count = parseInt(data.items[0].statistics.likeCount).toLocaleString();
                document.getElementById('like-count').innerText = `Likes: ${count}`;
            } catch (error) {
                showError(`Error fetching like count: ${error.message}`);
                document.getElementById('like-count').innerText = 'Error fetching like count';
            }
        }

        async function getLiveChatId(videoId, apiKey) {
            try {
        const url = `https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,contentDetails,status&id=${videoId}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const liveBroadcast = data.items[0];
        if (!liveBroadcast) {
            showError('Live broadcast not found for the provided video ID');
            return;
        }

        const membersJoined = liveBroadcast.snippet.liveBroadcastContent; // or other fields related to members joining
        document.getElementById('members-joined').innerText = `Members Joined: ${membersJoined}`;  // Display the joined members info
    } catch (error) {
        showError(`Error fetching members joined: ${error.message}`);
        document.getElementById('members-joined').innerText = 'Error fetching members joined';
    }
        }

        function formatTimestamp(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString();
        }

        async function fetchChatMessages(liveChatId, apiKey) {
            if (!liveChatId) {
                document.getElementById('chat-container').innerText = 'No active live chat found.';
                return;
            }

            try {
                const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&pageToken=${nextPageToken}&key=${apiKey}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error.message);
                }

                nextPageToken = data.nextPageToken;

                const chatContainer = document.getElementById('chat-container');
                const messages = data.items.reverse();

                if (isFirstChatLoad) {
                    chatContainer.innerHTML = '';
                    isFirstChatLoad = false;
                }

                messages.forEach(message => {
                    const isSuperChat = message.snippet.superChatDetails !== undefined;
                    const messageElement = document.createElement('div');
                    messageElement.className = `chat-message ${isSuperChat ? 'superchat' : ''}`;
                    
                    messageElement.innerHTML = `
                        <span class="timestamp">[${formatTimestamp(message.snippet.publishedAt)}]</span>
                        <span class="username">${message.authorDetails.displayName}:</span>
                        <span class="message-text">${message.snippet.displayMessage}</span>
                        ${isSuperChat ? `<span class="superchat-amount">(${message.snippet.superChatDetails.amountDisplayString})</span>` : ''}
                    `;
                    
                    chatContainer.insertBefore(messageElement, chatContainer.firstChild);
                });

                // Keep only the last 100 messages to prevent memory issues
                while (chatContainer.children.length > 100) {
                    chatContainer.removeChild(chatContainer.lastChild);
                }

                // Scroll to bottom if user hasn't scrolled up
                if (chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 100) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            } catch (error) {
                showError(`Error fetching chat messages: ${error.message}`);
            }
        }

        async function fetchSuperChats(videoId, apiKey) {
            const liveChatId = await getLiveChatId(videoId, apiKey);
            if (!liveChatId) {
                document.getElementById('superchat-list').innerText = 'No active live chat found.';
                return;
            }

            try {
                const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${apiKey}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error.message);
                }

                const superChats = data.items
                    .filter(item => item.snippet.superChatDetails)
                    .map(chat => ({
                        user: chat.authorDetails.displayName,
                        amount: chat.snippet.superChatDetails.amountDisplayString,
                        message: chat.snippet.displayMessage
                    }));

                let scList = document.getElementById('superchat-list');
                scList.innerHTML = superChats.length
                    ? superChats.map(chat => `<p><b>${chat.user}</b> (${chat.amount}): ${chat.message}</p>`).join('')
                    : 'No Super Chats yet.';
            } catch (error) {
                showError(`Error fetching super chats: ${error.message}`);
                document.getElementById('superchat-list').innerText = 'Error fetching Super Chats';
            }
        }

        let intervals = [];

        function clearExistingIntervals() {
            intervals.forEach(interval => clearInterval(interval));
            intervals = [];
            nextPageToken = '';
            isFirstChatLoad = true;
        }

        async function startTracking() {
    console.log('Starting tracking...');
    clearExistingIntervals();
    
    const userInput = document.getElementById('youtube-link').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    console.log('User input:', userInput);

    if (!apiKey) {
        showError('Please enter your YouTube API Key');
        return;
    }

    if (!userInput) {
        showError('Please enter a YouTube link or ID');
        return;
    }

    console.log('Extracting YouTube IDs...');
    let { channelId, videoId, username } = extractYouTubeIDs(userInput);
    console.log('Extracted IDs:', { channelId, videoId, username });

    if (videoId && !channelId) {
        console.log('Fetching channel ID from video...');
        channelId = await getChannelIdFromVideo(videoId, apiKey);
        if (!channelId) {
            showError('Could not fetch the channel ID from video.');
            return;
        }
        console.log('Retrieved channel ID:', channelId);
    }

    if (channelId) {
        console.log('Found channel ID, fetching subscriber count...');
        await fetchSubscriberCount(channelId, apiKey);
        intervals.push(setInterval(() => fetchSubscriberCount(channelId, apiKey), 10000));
    } else {
        console.log('No channel ID found');
    }

    if (videoId) {
        console.log('Found video ID, fetching video stats...');
        const liveChatId = await getLiveChatId(videoId, apiKey);
        
        await fetchLikeCount(videoId, apiKey);
        await fetchSuperChats(videoId, apiKey);
        await fetchChatMessages(liveChatId, apiKey);
        
        intervals.push(setInterval(() => fetchLikeCount(videoId, apiKey), 10000));
        intervals.push(setInterval(() => fetchSuperChats(videoId, apiKey), 10000));
        intervals.push(setInterval(() => fetchChatMessages(liveChatId, apiKey), 10000));
    } else {
        console.log('No video ID found');
    }
}