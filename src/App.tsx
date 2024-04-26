import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, SubmitHandler } from "react-hook-form";

type Inputs = {
  textInput: string;
  fileInput: File;
};

function App() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();

  const formSubmit: SubmitHandler<Inputs> = (data) => console.log(data);

  return (
    <div className="bg-slate-100 min-h-dvh w-full p-2 md:p-10">
      <form
        onSubmit={handleSubmit(formSubmit)}
        className="bg-white shadow-lg p-5 md:p-10 rounded-lg md:w-2/3 lg:w-1/2 mx-auto"
      >
        <div className="flex flex-col lg:flex-row lg:items-center mb-5">
          <Label className="md:w-1/3 text-xl mr-5" htmlFor="textInput">
            Text Input:
          </Label>
          <div className="w-full">
            <Input
              {...register("textInput", { required: true })}
              id="textInput"
              className={
                errors.textInput &&
                "border border-red-500 placeholder:text-red-500"
              }
              placeholder={
                errors.textInput ? "This field is required" : "Input Text"
              }
            />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center mb-5">
          <Label className="md:w-1/3 text-xl mr-5" htmlFor="fileInput">
            File Input:
          </Label>
          <div className="w-full">
            <Input
              {...register("fileInput", { required: true })}
              id="fileInput"
              type="file"
              className={
                errors.fileInput &&
                "border border-red-500 placeholder:text-red-500"
              }
            />
          </div>
        </div>
        <Button type="submit" className="px-5 py-3">
          Submit
        </Button>
      </form>
    </div>
  );
}

export default App;
