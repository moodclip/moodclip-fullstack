(function () {
	const scrollShowcase = () => {
		const box = document.querySelector(".scroll-showcase-box");
		const items = document.querySelectorAll(".scroll-showcase_item");
		let activeIndex = 0;
		let scrollCount = 0;
		const scrollThreshold = 7;
		const windowHeight = window.innerHeight;

		const setActiveImage = (index, opacity, scale) => {
			items.forEach((item, i) => {
				if (i < index) {
				
					item.style.transition = "transform 1s";
					
				} else {

					item.style.opacity = 0;
					item.style.transform = "scale(0.8)";
					item.style.transition = "transform 1s";
				}
			});



			if (index >= 0 ) {
				items[index].style.opacity = opacity;
			items[index].style.transform = `scale(${
				scale
			})`;
			}
				
			
			
		};

		const handleScrollInsideSection = (event) => {
	
			
			const delta = event.deltaY;
			if (delta > 0) {
				console.log(scrollCount, "ijneluc")
			
				scrollCount++;
				
				if (scrollCount <= scrollThreshold) {
	

					const opacity = 0.2 + (scrollCount / scrollThreshold) * 0.8;
					const scale = 0.8 + (scrollCount / scrollThreshold) * 0.2;

					setActiveImage(activeIndex, opacity, scale);
				}
				if (scrollCount >= scrollThreshold && activeIndex < items.length - 1) {
		

					activeIndex++;
					scrollCount = 0;
					setActiveImage(activeIndex, 0.2, 0.8);
				}
				console.log("111111",scrollCount)
	
			} else if (delta < 0) {
				console.log(111,"verev helnel if")
			
				scrollCount++;
				if (scrollCount <= scrollThreshold && activeIndex >= 0) {
					console.log(222,"opacity")

					const scale = 1 - (scrollCount / scrollThreshold) * 0.2;
					const opacity = 0.8 - (scrollCount / scrollThreshold) * 0.8;
					setActiveImage(activeIndex, opacity, scale);
				}
				if (scrollCount >= scrollThreshold && activeIndex >= 0) {
					console.log(333)

					//if (activeIndex > 0) {
						activeIndex--;
					//}
					
					scrollCount = 0;
					//setActiveImage(activeIndex, 1 ,1);
				}
				console.log(scrollCount)
		
			}

	
		};

		const checkBoxInView = () => {

				box.addEventListener("wheel", handleScrollInsideSection);

			
		};

		window.addEventListener("scroll", checkBoxInView);

		document.addEventListener("DOMContentLoaded", checkBoxInView);
	};

	document.addEventListener("DOMContentLoaded", function () {
		scrollShowcase();
	});
})();
