$(document).ready(function() {
	fb = new Firebase('https://jnevelson.firebaseio.com/webrtc');
	me = fb.push();
	name = window.prompt("enter name");
	sdp = me.child("sdp");
	ice = me.child("ice");
	presence = me.child("presence");
	pc = new webkitRTCPeerConnection({
        "iceServers": [{"url": "stun:23.21.150.121"}]
      }, {"optional": []});
	other = null;
	localVid = $('#local-video');
	remoteVid = $('#remote-video');

	sdp.onDisconnect().remove();
	presence.onDisconnect().remove();
	presence.set({name: name});

	$('#call').click(function() {
		if (other) {
			initiate(other, name);
		}
	});

  navigator.webkitGetUserMedia({video:true}, function(vs) {
		localVid.attr('src', URL.createObjectURL(vs));
		localVid.attr('title', name);
		pc.addStream(vs);
	});

	fb.on("child_added", function(snapshot) {
		var data = snapshot.val();
		if (data.presence && data.presence.name != name) {
			other = data.presence.name;
			remoteVid.attr('title', data.presence.name);
		}
	});

	fb.on("child_changed", function(snapshot) {
		var data = snapshot.val();

		if (data.sdp && data.sdp.to == name) {
			if (data.sdp.type == "offer") {
				accept(data.sdp.offer, data.sdp.from);
				sdp.set(null);
			}
			else if (data.sdp.type == "answer") {
				answer(data.sdp.answer);
				sdp.set(null);
			}
		}
		if (data.ice && data.ice.to == name) {
			var candidate = new RTCIceCandidate({
				sdpMLineIndex: data.ice.label,
				candidate: data.ice.candidate
			});
			pc.addIceCandidate(candidate);
			ice.set(null);
		}
	});
});


function answer(answer) {
  var desc = new RTCSessionDescription(JSON.parse(answer));
  pc.setRemoteDescription(desc);
}

function initiate(userid, fromname) {
	pc.onicecandidate = function(event) {
		iceCallback(event, userid);
	};

	pc.onaddstream = function(obj) {
		remoteVid.attr('src', URL.createObjectURL(obj.stream));
	};

	pc.createOffer(function(offer) {
		pc.setLocalDescription(offer, function() {
			setDescriptionCallback('offer', offer, userid, fromname);
		}, error);
	}, error);
}

function accept(offer, fromUser) {
  navigator.webkitGetUserMedia({video:true, audio:true}, function(vs) {
    pc.onicecandidate = function(event) {
			iceCallback(event, fromUser);
    };
    pc.addStream(vs);

    pc.onaddstream = function(obj) {
			remoteVid.attr('src', URL.createObjectURL(obj.stream));
			window.AudioContext = window.AudioContext || window.webkitAudioContext;
			var audioContext = new AudioContext();
			var mediaStreamSource = audioContext.createMediaStreamSource(obj.stream);
			mediaStreamSource.connect(audioContext.destination);
		};

    var desc = new RTCSessionDescription(JSON.parse(offer));
    pc.setRemoteDescription(desc, function() {
      pc.createAnswer(function(answer) {
        pc.setLocalDescription(answer, function() {
					setDescriptionCallback('answer', answer, fromUser, name);
        }, error);
      }, error);
    }, error);
  }, error);
}

function setDescriptionCallback(type, value, to, from) {
	var toSend = {
		type: type,
		to: to,
		from: from,
	};
	toSend[type] = JSON.stringify(value);
	fb.child(toSend.to).child('sdp').set(toSend);
}

function iceCallback(event, to) {
	if (event.candidate) {
		var iceSend = {
			to: to,
			label: event.candidate.sdpMLineIndex,
			id: event.candidate.sdpMid,
			candidate: event.candidate.candidate
		};
		fb.child(iceSend.to).child("ice").set(iceSend);
	}
}

function error(err) {
	console.log('error', err);
}
