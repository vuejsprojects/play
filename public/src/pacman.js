import {
    CANVAS_WIDTH_ORIG,
    CANVAS_WIDTH,
    CANVAS_HEIGHT_ORIG,
    CANVAS_HEIGHT,
    BACKGROUND,
    PAC_COLOR,
    BEAST_COLOR,
    PAC_HEIGHT,
    PAC_WIDTH,
    LEFT,
    RIGHT,
    UP,
    DOWN,
    HORIZONTAL,
    VERTICAL,
    INC,
    LINE_WIDTH,
    LINE_COLOR,
    ARC,
    BOOST_COLOR
} from './settings.js';
import { CANVAS_CENTER } from './point.js';
import { getDomManager } from './domManager.js'
import { sound } from './sound.js'


const domMgr = getDomManager();
//
// getPac is called by beast as well in this case it need a reference to pac
//
const getPac = function (context, prizes, dots, pac) {
    const openMouthimages = {};
    openMouthimages[UP] = [domMgr.getElementById('up'), domMgr.getElementById('up-red')];
    openMouthimages[DOWN] = [domMgr.getElementById('down'), domMgr.getElementById('down-red')];
    openMouthimages[LEFT] =  [domMgr.getElementById('left'), domMgr.getElementById('left-red')];
    openMouthimages[RIGHT] = [domMgr.getElementById('right'), domMgr.getElementById('right-red')];
    
    const closedMouthimages = {};
    closedMouthimages[PAC_COLOR] = domMgr.getElementById('full');
    closedMouthimages[BOOST_COLOR] =  domMgr.getElementById('full-red');

    const beastImage = domMgr.getElementById('beast');


    const getRelativePosition = function( position) {
        
        const relativePosition = {
            posX: position.posX - (CANVAS_WIDTH - CANVAS_WIDTH_ORIG) / 2,
            posY: ((CANVAS_HEIGHT - CANVAS_HEIGHT_ORIG) / 2) - position.posY
        }
        return relativePosition;
    };

    const isInCanvasWidth = function(posX) {
        return posX > CANVAS_WIDTH_ORIG && posX < CANVAS_WIDTH;
    };

    const canMoveHorizontally = function(position, parcours) {
        if (isInCanvasWidth(position.posX)) {
            return parcours.isOnTrack(getRelativePosition( {
                posX: position.posX,
                posY: position.posY
            }));
        }
        return false;
    };

    const isInCanvasHeight = function(posY) {
        return posY > CANVAS_HEIGHT_ORIG && posY < CANVAS_HEIGHT;
    };

    const canMoveVertically = function(position, parcours) {
        if (isInCanvasHeight(position.posY)) {
            return parcours.isOnTrack(getRelativePosition( {
                posX: position.posX,
                posY: position.posY
            }));
        }
        return false;
    };

    const isMoveValid = function (wishedPosition, parcours) {
        if (wishedPosition.axis === HORIZONTAL) {
            return canMoveHorizontally(wishedPosition.position, parcours);
        }
        else {
            return canMoveVertically(wishedPosition.position, parcours);
        }
    };
    const getWishedPosition = function(currentPosition, direction) {
        const axis = (direction === LEFT || direction === RIGHT) ? HORIZONTAL : VERTICAL;
        const newPosX = (direction === LEFT) ? currentPosition.posX - INC : (direction === RIGHT) ? currentPosition.posX + INC : currentPosition.posX;
        const newPosY = (direction === UP) ? currentPosition.posY - INC : (direction === DOWN) ? currentPosition.posY + INC : currentPosition.posY;
        return {
            axis: axis,
            position: {
                posX: newPosX,
                posY: newPosY
            }
        }

    };
    const centerPacCoordinates = function(shape, coordinates) {
        const center = {
            posX: 0,
            posY: 0
        }
        if (shape === ARC) {
            center.posX =  coordinates.posX;
            center.posY = coordinates.posY;
        }
        else {
            center.posX =  coordinates.posX - (PAC_WIDTH / 2);
            center.posY = coordinates.posY - (PAC_HEIGHT / 2);
        }
        return center
    };

    return {
        LEFT: LEFT,
        RIGHT: RIGHT,
        UP: UP,
        DOWN: DOWN,
        posX: 0,
        posY: 0,
        prevPosX: 0,
        prevPosY: 0,
        beast: false,
        color: PAC_COLOR,
        myShape: ARC,
        specialPower: false,
        pacAlive: true,
        openMouth: false,
        powerTimeout: undefined,
        beastsManager: undefined,
        gameManager: undefined,
        roundOver: false,
        gameStarted: false,
        beep: sound("src/sounds/hyper_short_beep.mp3"),
        crunch: sound("src/sounds/short_crunch.mp3"),
        bell: sound("src/sounds/bell.mp3"),
        one_less_beast: sound("src/sounds/one_less_beast.mp3"),

        iAmBeast: function() {
            this.beast = true;
            this.color = BEAST_COLOR;
        },
        isBeast: function() {
            return this.beast;
        },
        setGameManager: function(gameManager) {
            this.gameManager = gameManager;
        },
        initialPosition: function (position, shape) {
            this.myShape = shape || this.myShape;
            const center = centerPacCoordinates(this.myShape, position);
            this.posX = center.posX;
            this.posY = center.posY;
            this.prevPosX = this.posX;
            this.prevPosY = this.posY;
            this.openMouth = false;
            this.draw();
        },
        setBeastsManager: function(beastsManager) {
            this.beastsManager = beastsManager;
        },
        move: function (event, parcours) {
            const direction = event.keyCode;
            this.prevPosX = this.posX;
            this.prevPosY = this.posY;
            const that = this;
            const wishedPosition = getWishedPosition(that, direction);
            if (isMoveValid(wishedPosition, parcours)) {
                this.setNewPosition(wishedPosition);
                this.draw(direction);
                return true;
            }
            else {
                return false;
            }
        },
        setNewPosition: function(newPosition) {
            this.posX = newPosition.position.posX;
            this.posY = newPosition.position.posY;
        },
        draw: function(direction) {
            if (this.prevPosX && this.prevPosY) {
                this.drawPreviousPosition();
                // TODO why previousPos
                const relativePosition = getRelativePosition({posX: this.prevPosX, posY: this.prevPosY});
                this.checkIfOnThePrize(relativePosition.posX, relativePosition.posY, this.isBeast());
                this.checkIfOnTheDot(relativePosition.posX, relativePosition.posY);
            }

            if (this.isBeast()){
                if (this.posX === pac.posX && this.posY === pac.posY) {
                    if (pac.hasSpecialPower()) {
                        this.deactiveBeast();
                        this.one_less_beast.play();
                        this.gameManager.incrementCounter(10);
                        return;
                    }
                    else {
                        pac.gameOver();
                    }
                }
            }
            else {
                const matchingBeast = this.beastsManager.matchBeastPosition(this);
                if (matchingBeast) {
                    if (this.hasSpecialPower()) {
                        matchingBeast.deactiveBeast();
                        this.gameManager.incrementCounter(10);
                        return;
                    }
                    else {
                        this.gameOver();
                    }
                }
            }

            this.drawCurrentPosition(direction)
        },
        checkIfOnThePrize: function(x, y, isBeast) {
            const prizeIndex = prizes.isPrizeLocation(x, y, isBeast);
            if (prizeIndex !== undefined) {
                if (isBeast) {
                    prizes.redrawPrize(prizeIndex);
                }
                else {
                    this.crunch.play();
                    this.gameManager.incrementCounter(5);
                    // if (prizes.areAllLocationsInactive() && !this.isBeast()) {
                    //     this.gameWon();
                    // }
                    // else {
                        this.acquireSpecialPower();
                        this.color = BOOST_COLOR;
                        if (this.powerTimeout) {
                            clearTimeout(this.powerTimeout);
                        }
                        this.powerTimeout = setTimeout(this.prepareEndOfSpecialPower(), 10000);
                    // }
                }
            }

        },
        checkIfOnTheDot: function(x, y) {
            const dotIndex = dots.isDotLocation(x, y, this.isBeast());
            if (dotIndex !== undefined) {
                if( this.isBeast()) {
                    dots.redrawDot(dotIndex);
                }
                else {
                    this.gameManager.incrementCounter(1);
                    if (dots.areAllLocationsInactive() && !this.isBeast()) {
                        this.gameWon();
                    }
                }
            }
        },
        drawCurrentPosition: function(direction) {
            const x = this.posX;
            const y =  this.posY;
            const color = this.color;
            this.drawPosition(x, y, color, direction);
        },
        drawPreviousPosition: function() {
            const x = this.prevPosX;
            const y =  this.prevPosY;
            const color = LINE_COLOR;
            this.drawPosition(x, y, color);
        },
        drawPosition: function(x, y, color, direction) {
            context.beginPath();
            if (color === LINE_COLOR) {
                context.fillStyle = color;
                context.arc(x, y, PAC_WIDTH / 2, 0, 2 * Math.PI);
                context.fill();
            }
            else if (this.beast) {
                this.drawImage(x, y, color, direction, this.openMouth, this.beast);
            }
            else {
                if (!this.gameManager.isRoundOver() && this.gameManager.isGameStarted()) {
                    this.makeSound();
                }
                this.drawImage(x, y, color, direction, this.openMouth);
                this.openMouth = !this.openMouth;
            }
            context.closePath();
        },
        drawImage: function(x, y, color, direction, openMouth, isBeast) {
            const image = this.getImage(color, direction, openMouth, isBeast);
            context.drawImage(image, x - 10, y - 10);
        },
        getImage: function(color, direction, openMouth, isBeast) {
            if (isBeast) {
                return beastImage;
            }
            else if (openMouth) {
                const selector = color === BOOST_COLOR ? 1 : 0;
                return openMouthimages[direction][selector];
            }
            else {
                return closedMouthimages[color];
            }
        },
        acquireSpecialPower: function() {
            this.specialPower = true;
        },
        hasSpecialPower: function() {
            return this.specialPower;
        },
        prepareEndOfSpecialPower: function() {
            const that = this;
            return function() {
                that.endOfSpecialPower()
            };

        },
        endOfSpecialPower: function() {
            this.color = PAC_COLOR;
            // arbitrary UP other I need to store the direction in a property
            this.drawCurrentPosition(UP);
            this.specialPower = false;
        },
        gameOver: function() {
            this.deactivatePac(); 
            this.gameManager.gameOver();
        },
        gameWon:  function() {
            this.closeMouth();
            this.endOfSpecialPower();
            this.gameManager.gameWon();
        },
        deactivatePac: function() {
            this.pacAlive = false;
        },
        reactivatePac: function() {
            this.pacAlive = true;
            this.initialPosition(CANVAS_CENTER);
        },
        isPacAlive: function() {
            return this.pacAlive;
        },
        makeSound: function() {
            this.beep.play();
        },
        closeMouth : function() {
            this.openMouth = false;
        },
    }
}

export {getPac};