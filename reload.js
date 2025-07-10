document.getElementsByTagName("html")[0].innerHTML = `
	<html style="height: 100%;">
		<head>
			<title>Anubypass</title>
			<style>
				html, body {
					height: 100%;
					margin: 0;
				}

				body {
					font-family: sans-serif;
					display: flex;
					flex-direction: column;
					justify-content: center;
				}

				div {
					text-align: center;
				}

				img {
					height: 20em; max-height: 100%;
				}
			</style>
			<meta name="viewport" content="width=device-width, initial-scale=1">
		</head>
		<body>
			<div>
				<img src="${chrome.runtime.getURL('logo/full.svg')}">
				<h1>Challenge bypassed</h1>
				<h3>Reloading page...</h3>
			</div>
		</body>
	</html>
`;
window.location.reload();
