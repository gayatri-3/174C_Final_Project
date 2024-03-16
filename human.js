import {tiny, defs} from './examples/common.js';

// import './linear-algebra-js/node/linear-algebra.js';
// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

const shapes = {
    'sphere': new defs.Subdivision_Sphere( 5 ),
};

export
const Articulated_Human = 
class Articulated_Human {
    constructor() {
        const sphere_shape = shapes.sphere;

        // torso node
        const torso_transform = Mat4.scale(2, 5, 1);
        this.torso_node = new Node("torso", sphere_shape, torso_transform);
        // root->torso
        const root_location = Mat4.translation(-3, 10, 35);
        this.root = new Arc("root", null, this.torso_node, root_location);

        // head node
        let head_transform = Mat4.scale(1.2, 1.2, 1.2);
        head_transform.pre_multiply(Mat4.translation(0, 1.2, 0));
        this.head_node = new Node("head", sphere_shape, head_transform);
        // torso->neck->head
        const neck_location = Mat4.translation(0, 5, 0);
        this.neck = new Arc("neck", this.torso_node, this.head_node, neck_location);
        this.torso_node.children_arcs.push(this.neck);

        // right upper arm node
        let ru_arm_transform = Mat4.scale(2, .4, .4);
        ru_arm_transform.pre_multiply(Mat4.translation(2.4, 0, 0));
        this.ru_arm_node = new Node("ru_arm", sphere_shape, ru_arm_transform);
        // torso->r_shoulder->ru_arm
        const r_shoulder_location = Mat4.translation(1.2, 4, 0);
        this.r_shoulder = new Arc("r_shoulder", this.torso_node, this.ru_arm_node, r_shoulder_location);
        this.torso_node.children_arcs.push(this.r_shoulder)
        this.r_shoulder.set_dof(true, true, true);

        // right lower arm node
        let rl_arm_transform = Mat4.scale(2, .4, .4);
        rl_arm_transform.pre_multiply(Mat4.translation(2, 0, 0));
        this.rl_arm_node = new Node("rl_arm", sphere_shape, rl_arm_transform);
        // ru_arm->r_elbow->rl_arm
        const r_elbow_location = Mat4.translation(4.8, 0, 0);
        this.r_elbow = new Arc("r_elbow", this.ru_arm_node, this.rl_arm_node, r_elbow_location);
        this.ru_arm_node.children_arcs.push(this.r_elbow)
        this.r_elbow.set_dof(true, true, false);

        // right hand node
        let r_hand_transform = Mat4.scale(.8, .6, .4);
        r_hand_transform.pre_multiply(Mat4.translation(0.8, 0, 0));
        this.r_hand_node = new Node("r_hand", sphere_shape, r_hand_transform);
        // rl_arm->r_wrist->r_hand
        const r_wrist_location = Mat4.translation(4, 0, 0);
        this.r_wrist = new Arc("r_wrist", this.rl_arm_node, this.r_hand_node, r_wrist_location);
        this.rl_arm_node.children_arcs.push(this.r_wrist);
        this.r_wrist.set_dof(false, true, true);
        const r_hand_end_local_pos = vec4(1.6, 0, 0, 2);
        this.right_end_effector = new End_Effector("right_hand", this.r_wrist, r_hand_end_local_pos);
        this.r_wrist.end_effector = this.right_end_effector;
        this.dof = 7;
        this.right_theta = [0, 0, 0, 0, 0, 0, 0];
        
        // left upper arm node
        let lu_arm_transform = Mat4.scale(2.4, .4, .4);
        lu_arm_transform.pre_multiply(Mat4.translation(-2.4, 0, 0));
        this.lu_arm_node = new Node("lu_arm", sphere_shape, lu_arm_transform);
        // torso->r_shoulder->ru_arm
        const l_shoulder_location = Mat4.translation(-1.2, 4, 0);
        this.l_shoulder = new Arc("l_shoulder", this.torso_node, this.lu_arm_node, l_shoulder_location);
        this.torso_node.children_arcs.push(this.l_shoulder)
        this.l_shoulder.set_dof(true, true, true);

         // left lower arm node
        let ll_arm_transform = Mat4.scale(2, .4, .4);
        ll_arm_transform.pre_multiply(Mat4.translation(-2, 0, 0));
        this.ll_arm_node = new Node("ll_arm", sphere_shape, ll_arm_transform);
        // lu_arm->l_elbow->ll_arm
        const l_elbow_location = Mat4.translation(-4.8, 0, 0);
        this.l_elbow = new Arc("l_elbow", this.lu_arm_node, this.ll_arm_node, l_elbow_location);
        this.lu_arm_node.children_arcs.push(this.l_elbow)
        this.l_elbow.set_dof(true, true, false);

        // left hand node
        let l_hand_transform = Mat4.scale(.8, .6, .4);
        l_hand_transform.pre_multiply(Mat4.translation(-0.8, 0, 0));
        this.l_hand_node = new Node("l_hand", sphere_shape, l_hand_transform);
        // rl_arm->r_wrist->r_hand
        const l_wrist_location = Mat4.translation(-4, 0, 0);
        this.l_wrist = new Arc("l_wrist", this.ll_arm_node, this.l_hand_node, l_wrist_location);
        this.ll_arm_node.children_arcs.push(this.l_wrist);
        this.l_wrist.set_dof(false, true, true);
        const l_hand_end_local_pos = vec4(1.6, 0, 0, 2);
        this.left_end_effector = new End_Effector("left_hand", this.l_wrist, l_hand_end_local_pos);
        this.l_wrist.end_effector = this.left_end_effector;
        this.dof = 7;
        this.left_theta = [0, 0, 0, 0, 0, 0, 0];        
    }

    // mapping from global theta to each joint theta
    apply_theta() {
        this.r_shoulder.update_articulation(this.right_theta.slice(0, 3));
        this.r_elbow.update_articulation(this.right_theta.slice(3, 5));
        this.r_wrist.update_articulation(this.right_theta.slice(5, 7));
        
        this.l_shoulder.update_articulation(this.left_theta.slice(0, 3));
        this.l_elbow.update_articulation(this.left_theta.slice(3, 5));
        this.l_wrist.update_articulation(this.left_theta.slice(5, 7));
    }

    calculate_right_Jacobian() {
        // use newton's method in order to find the jacobian
        const delta = 1e-4;
        let J = new Array(this.dof);
        for (let i = 0; i < this.dof; i++) {
            J[i] = new Array(3).fill(0);
        }
        const right_orig_pos = this.get_right_end_effector_position();
        // TODO: Implement your Jacobian here
        for (let i = 0; i < this.dof; i++){
            this.right_theta[i] += delta;
            this.apply_theta();
            const right_new_pos = this.get_right_end_effector_position();
            for (let j = 0; j < 3; j++)
            J[i][j] = (right_new_pos[j] - right_orig_pos[j]) / delta;
        this.apply_theta();
        this.right_theta[i] -= delta;
        }
        return J; // 3x7 in my case.
    }

    calculate_left_Jacobian() {
        // use newton's method in order to find the jacobian
        const delta = 1e-4;
        let J = new Array(this.dof);
        for (let i = 0; i < this.dof; i++) {
            J[i] = new Array(3).fill(0);
        }
        const left_orig_pos = this.get_left_end_effector_position();
        // TODO: Implement your Jacobian here
        for (let i = 0; i < this.dof; i++){
            this.left_theta[i] += delta;
            this.apply_theta();
            const left_new_pos = this.get_left_end_effector_position();
            for (let j = 0; j < 3; j++)
            J[i][j] = (left_new_pos[j] - left_orig_pos[j]) / delta;
        this.apply_theta();
        this.left_theta[i] -= delta;
        }
        return J; // 3x7 in my case.
    }

    calculate_right_leg_Jacobian() {
        // use newton's method in order to find the jacobian
        const delta = 1e-4;
        let J = new Array(this.dof);
        for (let i = 0; i < this.dof; i++) {
            J[i] = new Array(3).fill(0);
        }
        const right_orig_pos = this.get_right_leg_end_effector_position();
        // TODO: Implement your Jacobian here
        for (let i = 0; i < this.dof; i++){
            this.right_leg_theta[i] += delta;
            this.apply_theta();
            const right_new_pos = this.get_right_leg_end_effector_position();
            for (let j = 0; j < 3; j++)
            J[i][j] = (right_new_pos[j] - right_orig_pos[j]) / delta;
        this.apply_theta();
        this.right_leg_theta[i] -= delta;
        }
        return J; // 3x7 in my case.
    }

    calculate_inverse_Jacobian(J){
        // use SVD in order to forgo singularities entirely
        var singular_value_decomposition = numeric.svd(J);
        const a = singular_value_decomposition.U;
        const b = singular_value_decomposition.S;
        const c = singular_value_decomposition.V;
        var pseudoinverse = numeric.dot(numeric.dot(c, numeric.diag(b.map(value => (value !== 0) ? 1 / value : -1))), numeric.transpose(a));
        if (J[0].length > J.length) {
            return numeric.transpose(pseudoinverse);
        } else {
            return pseudoinverse;
        }
    }

    calculate_delta_theta(J, dx) {
        const A = math.multiply(math.transpose(J), J);
        // console.log(A);
        // console.log(dx);
        const b = math.multiply(math.transpose(J), dx);
        // const b = math.multiply(math.transpose(J), dx);
        // console.log(b);
        const x = math.lusolve(A, b);
        console.log(x);

        return x;
    }

    get_right_end_effector_position() {
        // in this example, we only have one end effector.
        this.matrix_stack = [];
        this._rec_update(this.root, Mat4.identity());
        const v = this.right_end_effector.global_position; // vec4
        return vec3(v[0], v[1], v[2]);
    }

    get_right_leg_end_effector_position() {
        // in this example, we only have one end effector.
        this.matrix_stack = [];
        this._rec_update(this.root, Mat4.identity());
        const v = this.right_leg_end_effector.global_position; // vec4
        return vec3(v[0], v[1], v[2]);
    }

    get_left_end_effector_position() {
        // in this example, we only have one end effector.
        this.matrix_stack = [];
        this._rec_update(this.root, Mat4.identity());
        const v = this.left_end_effector.global_position; // vec4
        return vec3(v[0], v[1], v[2]);
    }

    _rec_update(arc, matrix) {
        if (arc !== null) {
            const L = arc.location_matrix;
            const A = arc.articulation_matrix;
            matrix.post_multiply(L.times(A));
            this.matrix_stack.push(matrix.copy());

            if (arc.end_effector !== null) {
                arc.end_effector.global_position = matrix.times(arc.end_effector.local_position);
            }

            const node = arc.child_node;
            const T = node.transform_matrix;
            matrix.post_multiply(T);

            matrix = this.matrix_stack.pop();
            for (const next_arc of node.children_arcs) {
                this.matrix_stack.push(matrix.copy());
                this._rec_update(next_arc, matrix);
                matrix = this.matrix_stack.pop();
            }
        }
    }

    draw(webgl_manager, uniforms, material) {
        this.matrix_stack = [];
        this._rec_draw(this.root, Mat4.identity(), webgl_manager, uniforms, material);
    }

    _rec_draw(arc, matrix, webgl_manager, uniforms, material) {
        if (arc !== null) {
            const L = arc.location_matrix;
            const A = arc.articulation_matrix;
            matrix.post_multiply(L.times(A));
            this.matrix_stack.push(matrix.copy());

            const node = arc.child_node;
            const T = node.transform_matrix;
            matrix.post_multiply(T);
            node.shape.draw(webgl_manager, uniforms, matrix, material);

            matrix = this.matrix_stack.pop();
            for (const next_arc of node.children_arcs) {
                this.matrix_stack.push(matrix.copy());
                this._rec_draw(next_arc, matrix, webgl_manager, uniforms, material);
                matrix = this.matrix_stack.pop();
            }
        }
    }
}

class Node {
    constructor(name, shape, transform) {
        this.name = name;
        this.shape = shape;
        this.transform_matrix = transform;
        this.children_arcs = [];
    }
}

class Arc {
    constructor(name, parent, child, location) {
        this.name = name;
        this.parent_node = parent;
        this.child_node = child;
        this.location_matrix = location;
        this.articulation_matrix = Mat4.identity();
        this.end_effector = null;
        this.dof = {
            Rx: false,
            Ry: false,
            Rz: false,
        }
    }

    // Here I only implement rotational DOF
    set_dof(x, y, z) {
        this.dof.Rx = x;
        this.dof.Ry = y;
        this.dof.Rz = z;
    }

    update_articulation(theta) {
        this.articulation_matrix = Mat4.identity();
        let index = 0;
        if (this.dof.Rx) {
            this.articulation_matrix.pre_multiply(Mat4.rotation(theta[index], 1, 0, 0));
            index += 1;
        }
        if (this.dof.Ry) {
            this.articulation_matrix.pre_multiply(Mat4.rotation(theta[index], 0, 1, 0));
            index += 1;
        }
        if (this.dof.Rz) {
            this.articulation_matrix.pre_multiply(Mat4.rotation(theta[index], 0, 0, 1));
        }
    }
}

class End_Effector {
    constructor(name, parent, local_position) {
        this.name = name;
        this.parent = parent;
        this.local_position = local_position;
        this.global_position = null;
    }
}