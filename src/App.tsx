import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useForm, SubmitHandler } from "react-hook-form";
// import {
//   APIGatewayClient,
//   GetAccountCommand,
// } from "@aws-sdk/client-api-gateway";

type Inputs = {
  textInput: string;
  fileInput: FileList;
};

const isTextFile = (fileName: string): boolean => {
  const acceptedExtensions = ["txt", "text", "yml"];
  const fileExtension = fileName.split(".").pop()?.toLowerCase();
  return acceptedExtensions.includes(fileExtension!);
};

function App() {
  // const client = new APIGatewayClient({ region: "us-east-1" });
  // const params = {
  //   /** input parameters */
  // };
  // const command = new GetAccountCommand(params);
  // console.log(command);

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const response = await client.send(command);
  //       console.log(response);
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   })();
  // }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();

  const formSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      const file = data.fileInput[0];
      if (!isTextFile(file.name)) {
        throw new Error("Invalid file type");
      }
      const preSignerResponse = await axios.post(
        "https://p6a52727uk.execute-api.us-east-1.amazonaws.com/prod/getPreSignedUrl",
        { fileName: file.name }
      );
      const preSignedUrl = preSignerResponse.data.uploadUrl;

      const uploadS3Response = await axios.put(preSignedUrl, file);
      if (uploadS3Response.status === 200) {
        const response = await axios.post(
          "https://p6a52727uk.execute-api.us-east-1.amazonaws.com/prod/updateDB",
          { textInput: data.textInput, fileInputPath: file.name }
        );
        console.log(response);
      }
    } catch (error) {
      console.error(error);
    }
  };

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
