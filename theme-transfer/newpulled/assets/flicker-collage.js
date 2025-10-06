(function () {
	const flickerCollage = () => {
		const container = document.querySelector(".flicker-collage-box");
		if (!container) return;
		const items = [...document.querySelectorAll(".flicker-collage_item")];
		let currentIndex = 0;
		let animationInterval;

		//function getRandomPosition() {
		//	const positions = [
		//		{ gridArea: "2/2/6/5" },
		//		{ gridArea: "1/9/3/11" },
		//		{ gridArea: "6/17/9/20" },
		//		{ gridArea: "9/5/11/10" },
		//		{ gridArea: "2/19/5/22" },
		//		{ gridArea: "7/2/10/6" },
		//	];
		//	return positions[Math.floor(Math.random() * positions.length)];
		//}
		function getPositions() {
			if (window.innerWidth < 768) {
				return [
					{ gridArea: "2/2/4/10" },
					{ gridArea: "1/14/3/21" },
					{ gridArea: "8/16/10/22" },
					{ gridArea: " 9/2/11/10" },
					{ gridArea: "13/1/15/4" },
					{ gridArea: "16/2/18/5" },
				];
			} else if (window.innerWidth < 1200) {
				return [
					{ gridArea: "2/2/5/6" },
					{ gridArea: "1/8/3/13" },
					{ gridArea: "4/16/6/20" },
					{ gridArea: "7/5/9/9" },
					{ gridArea: "2/10/4/13" },
					{ gridArea: "9/2/11/7" },
				];
			} else {
				return [
					{ gridArea: "2/2/6/5" },
					{ gridArea: "1/9/3/11" },
					{ gridArea: "6/17/9/20" },
					{ gridArea: "9/5/11/10" },
					{ gridArea: "2/19/5/22" },
					{ gridArea: "7/2/10/6" },
				];
			}
		}
		function getRandomPosition() {
			const positions = getPositions();
			return positions[Math.floor(Math.random() * positions.length)];
		}
		function isOverlapping(newPosition) {
			return items.some((item) => {
				if (!item.classList.contains("visible")) return false;
				const itemPosition = window.getComputedStyle(item).gridArea;
				return itemPosition === newPosition.gridArea;
			});
		}

		function getUniquePosition() {
			let newPosition;
			let tries = 0;
			const maxTries = 10;
			do {
				newPosition = getRandomPosition();
				tries++;
			} while (isOverlapping(newPosition) && tries < maxTries);
			return newPosition;
		}

		function updateVisibility() {
			items.forEach((item) => item.classList.remove("visible"));

			for (let i = 0; i < 2; i++) {
				const index = (currentIndex + i) % items.length;
				items[index].classList.add("visible");
			}

			const disappearingIndex = (currentIndex + 3) % items.length;
			const disappearingItem = items[disappearingIndex];

			setTimeout(() => {
				const newPosition = getUniquePosition();

				disappearingItem.style.gridArea = newPosition.gridArea;
				disappearingItem.classList.add("visible");
			}, 1500);
			currentIndex = (currentIndex + 1) % items.length;
		}

		function startAnimation() {
			if (animationInterval) clearInterval(animationInterval);
			animationInterval = setInterval(updateVisibility, 1500);
		}

		document.addEventListener("shopify:section:load", startAnimation);
		startAnimation();
	};

	document.addEventListener("DOMContentLoaded", flickerCollage);
})();
