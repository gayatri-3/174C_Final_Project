# CS 174C Assignment 1
Gayatri Puppala 
UID: 805768600

## Part 1: Hermite Spline Modeling

The code for this part is written in part_one_hermite.js.
I created a spline class to keep track of all the points and tangents and to create helper functions.

That way to create it in the init function, all I have to do is create an instance of it:
    this.spline = new Spline();
    this.sample_cnt = 1000;

It also makes it easier to draw. I just write 
    this.curve.draw(caller, this.uniforms);
inside the render_animation function to draw the curve. 

There are 4 buttons I programmed for this section:
### 1. Parse Commands

There's 4 shell commands in this section:
1. add point <x y z, sx, sy, sz>
   1. this adds a point to the spline
   2. It calls the add_point function in the spline class. I add a vector to the positions[] array with this position.
2. set tangent <index> <x y z>
   1. this sets the components of the tangent specified by the index
3. set point <index> <x y z>
   1. this sets the components of the point specified by the index
4. get_arc_length
   1. this uses a piecewise linear approximation and a look-up table to print the arc length of a spline

I created a parser to read in the data in the input text. 
If it matched any of the above commands, I fed it into the corresponding helper functions in the spline class.
Otherwise, it outputs invalid. 

### 2. Draw

In the callback function for Draw called update_scene, I create a curve using the position data from the spline class.
It calls the get_positions function from the spline class. 
Here I return the interpolated position based on the time as calculated by the hermite spline function.
I'm able to pass these into a curve to draw it.

### 3. Load

I take the shell commands from the input box and store them as a text variable in the spline in the below format:
    <n>
    <c_x1 c_y1 c_z1 t_x1 t_y1 t_z1>
    <c_x2 c_y2 c_z2 t_x2 t_y2 t_z2>
    ....
    <c_xn c_yn c_zn t_xn t_yn t_zn>

This outputs the number of points followed by the point coordinates and tangent values.

I'm able to get this data from the positions and tangents arrays in the spline class.

Note: This only works after parse commands is pressed. 

### 4. Export 

If pressed after pressing "load," then in the output box, it will display 
the number of points and then the following point coordinates and their tangents.

## Part 2: Mass-Spring-Damper System

The code for this part is written in part_two_spring.js.
I created 3 classes to organize the code: particle, spring, and simulation.
For each class, I have an update function that adjusts the variables for every instance. 
In particle, I have separate helper functions to update position, velocity, and acceleration depending on the integration type.
In spring, I have a helper function to find the viscoelastic force.
In simulation, I have a "calculate ground force" function and a draw function that draws all the updated positions of the particles and the springs.

Since I have everything stored in the simulation class, all I have to do in the initialize function is create an instance of the simulation class.

There are 2 buttons I programmed for this section: 
### 1. Config

There's 8 shell commands in this section:
1. create particles <Number of Particles>
   1. this adds a specified number of new particles to the particles array in simulation
2. particle <index> <mass> <x y z vx vy vz>
   1. this sets the position, mass, and velocity for a specific particle
   2. this edits the specified attributes for the given particle
3. all_velocities <vx vy vz>
   1. this sets the velocity of all the particles and will overwrite the velocity set in the previous commands
   2. i iterate through the particles array in simulation class and change the velocity for all of them
4. create springs <Number of Springs>
   1. this adds a specified number of new springs to the particles array in simulation
5. link <sindex> <pindex1> <pindex2> <ks> <kd> <length>
   1. this creates a damped spring at index sIndex between 2 particles with the elasticity, viscosity, and length parameters
   2. this edits the specified attributes for the given spring
6. integration <"euler" | "symplectic" | "verlet"> <timestep>
   1. this sets the integration technique and sets the time step in the simulation class
   2. the integration technique affects how the forces and position for the particles are calculated.
   3. i used the forward euler, symplectic euler, and verlet functions to update the values
7. ground <ks> <kd>
   1. this sets the ground constraint parameters (elasticity and viscosity) in the simulation class
8. gravity <g>
   1. I set the gravity due to acceleration variable in the simulation class to a vector of <0, -1*g, 0> since gravity is a constant downward force.

I created a parser to read in the data in the input text.
If it matches any of the above commands, I adjust the variables and call the according helper functions.


### 2. Run

In this function, all I do is set a variable called running to true. 
Then it able to run a section of code in the render animation function.
This tells simulation to update based on the t_step.
