class CircleController {
    constructor() {
        this.radius = 75; // Match frontend default
        this.color = '#4CAF50'; // Match frontend default
    }

    changeColor(newColor) {
        this.color = newColor;
        return this.color;
    }

    changeRadius(newRadius) {
        this.radius = newRadius;
        return this.radius;
    }

    reset() {
        this.radius = 75; // Match frontend reset
        this.color = '#4CAF50'; // Match frontend reset
        return { radius: this.radius, color: this.color };
    }

    getCircleProperties() {
        return { radius: this.radius, color: this.color };
    }
}

module.exports = CircleController;