$(document).ready(function() {
	navigator.webkitGetUserMedia({ video: true }, success, fail);

	fb = new Firebase('https://jnevelson.firebaseIO.com/webtrc');
	me = fb.push();
	console.log('me', me);
	fb.on('child_added', added);
	me.onDisconnect().remove();
});

function added(child) {
	// console.log(child);
}

function success(stream) {
	console.log('success', stream);

	$('#local-video').attr('src', URL.createObjectURL(stream));
	lpc = new webkitRTCPeerConnection(null);
	rpc = new webkitRTCPeerConnection(null);

	lpc.onicecandidate = function(event) {
		if (event.candidate) {
			// console.log('lpc', event);
			rpc.addIceCandidate(new RTCIceCandidate(event.candidate));
		}
	}

	rpc.onicecandidate = function(event) {
		if (event.candidate) {
			// console.log('rpc', event);
			lpc.addIceCandidate(new RTCIceCandidate(event.candidate));
		}
	}

	rpc.onaddstream = function(event) {
		// console.log('addstream', event);
		$('#remote-video').attr('src', URL.createObjectURL(event.stream));
	}

	lpc.addStream(stream);
	lpc.createOffer(function(desc) {
		console.log('lpc desc', desc);
		fb.set({offer: desc});

		lpc.setLocalDescription(desc);
		rpc.setRemoteDescription(desc);

		rpc.createAnswer(function(desc) {
			console.log('rpc answer', desc);
			fb.set({answer: desc});

			rpc.setLocalDescription(desc);
			lpc.setRemoteDescription(desc);
		});
	});
}

function fail(error) {
	console.log('error', error);
}
