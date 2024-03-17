# Amusement Park
### CS 174C Final Project

## Group Members

Gayatri Puppala (805768600)

Pavana Atawale (805503073)

Adithi Ramesh (105491865)

Ethan Dao (205687051)

# How to Run
Our code is on GitHub in the following project: https://github.com/gayatri-3/174C_Final_Project.git 

Downloaded the project zip file, and unzip it.
Run "index.html", and you should see a page that looks like the following screenshot.

![](./assets/screenshot.png)

### Special Notes
* Hit the "Reset Bumper Cars" button to view the bumper cars simulation.
* To see the fireworks, press the "Fireworks" button. Pressing it once turns the sky to night. To see the actual fireworks
display, just press the button again.
* The fountain is set up to start one stream at a time. Keep the simulation
running for a while to see the entire fountain.

# Project Elements
The animation algorithms we used in this project are as follows:
1. **Hermite Spline:** We used the Hermite Spline formula in our rollercoaster to 
create the track. We also made a car that followed the track, 
using the Spline formula to calculate the car's position and velocity 
throughout the simulation  
2. **Bezier Curve:** We used the De Casteljau algorithm to create a series of Bezier
curves, which made up our fountain. Then, we had particles follow each 
curve in a sequence to give the illusion of water flowing. 
3. **Collision Detection:** We used the collision detection algorithms in our bumper cars
to create realistic collisions.
4. **Time Integration with Particle Systems:** Fireworks
5. **Inverse Kinematics:** We used the inverse kinematics algorithm to create a 
teddy bear mascot dancing on a stage.
